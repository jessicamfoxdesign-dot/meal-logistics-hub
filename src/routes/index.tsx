import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, CircleAlert, HandHelping } from "lucide-react";
import { Shell } from "@/components/kitchen/Shell";
import { EntryDialog } from "@/components/kitchen/EntryDialog";
import { EmptyNote, StatusBadge, needsAttention } from "@/components/kitchen/bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  addDays,
  dayKey,
  formatDay,
  patchEntry,
  patchTask,
  toggleTask,
  useKitchen,
  useToday,
} from "@/lib/kitchen/store";
import { PHASE_LABEL, type Phase, type PlanEntry } from "@/lib/kitchen/types";

const PREFLIGHT_HORIZON_DAYS = 3;

type TaskSection = "setup" | "prep" | "cook";
const TASK_SECTIONS: { key: TaskSection; title: string }[] = [
  { key: "setup", title: PHASE_LABEL.setup },
  { key: "prep", title: PHASE_LABEL.prep },
  { key: "cook", title: PHASE_LABEL.cook },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — Kitchen Plan" },
      {
        name: "description",
        content:
          "Your dinner for today, what still needs checking, and the tasks that set up tomorrow.",
      },
      { property: "og:title", content: "Today — Kitchen Plan" },
      {
        property: "og:description",
        content:
          "Your dinner for today, what still needs checking, and the tasks that set up tomorrow.",
      },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const { data, ready } = useKitchen();
  const today = useToday();
  const tomorrow = addDays(today, 1);
  const [openId, setOpenId] = useState<string | null>(null);

  const todayEntries = data.entries.filter((e) => e.date === today);
  const tomorrowEntries = data.entries.filter((e) => e.date === tomorrow);

  const taskDay = (e: PlanEntry, t: PlanEntry["tasks"][number]) =>
    t.doDate ?? e.date;

  // Every task whose effective day is today, regardless of phase.
  const todayTasks = data.entries.flatMap((e) =>
    e.skipped
      ? []
      : e.tasks
          .filter((t) => taskDay(e, t) === today)
          .map((t) => ({ entry: e, task: t })),
  );

  // Tasks belonging to other days' entries go to "Sets up a later day";
  // all others are bucketed by phase. Any unknown phase falls into setup,
  // so no task can drop out of view.
  const aheadTasks = todayTasks.filter(({ entry }) => entry.date !== today);
  const sameDayTasks = todayTasks.filter(({ entry }) => entry.date === today);
  const sectionOf = (phase: Phase): TaskSection =>
    phase === "prep" ? "prep" : phase === "cook" ? "cook" : "setup";
  const bySection = (section: TaskSection) =>
    sameDayTasks.filter(({ task }) => sectionOf(task.phase) === section);

  const attentionByDay = Array.from(
    { length: PREFLIGHT_HORIZON_DAYS + 1 },
    (_, i) => addDays(today, i),
  )
    .map((date) => ({
      date,
      rows: data.entries
        .filter((e) => !e.skipped && e.date === date)
        .flatMap((e) =>
          e.items
            .filter((i) => needsAttention(i.status) || i.status === "unset")
            .map((i) => ({ entry: e, item: i })),
        ),
    }))
    .filter((g) => g.rows.length > 0);

  const helpItems = data.equipment.filter((e) => e.helpNeeded);

  const openEntry = data.entries.find((e) => e.id === openId);

  return (
    <Shell
      title={formatDay(today)}
      subtitle="Everything that matters today, and anything today sets up for later."
      action={
        <Button asChild variant="secondary" className="h-11">
          <Link to="/plan">
            <CalendarDays className="size-4" /> Plan
          </Link>
        </Button>
      }
    >
      {!ready ? (
        <EmptyNote>Loading your plan…</EmptyNote>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-xl">Tonight</h2>
            {todayEntries.length === 0 ? (
              <EmptyNote>
                Nothing planned for today.{" "}
                <Link to="/plan" className="underline">
                  Add something
                </Link>{" "}
                if you'd like.
              </EmptyNote>
            ) : (
              <ul className="grid gap-3">
                {todayEntries.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs tracking-wide text-muted-foreground uppercase">
                          {entry.kind === "mission" ? "Mission" : "Dinner"}
                        </p>
                        <h3 className="text-2xl">{entry.title}</h3>
                        {entry.skipped ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Marked not today — everything is kept.
                          </p>
                        ) : null}
                        {entry.notes ? (
                          <p className="mt-2 max-w-prose text-sm whitespace-pre-line text-muted-foreground">
                            {entry.notes}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="h-11"
                          onClick={() =>
                            patchEntry(entry.id, { skipped: !entry.skipped })
                          }
                        >
                          {entry.skipped ? "Back on" : "Not today"}
                        </Button>
                        <Button
                          className="h-11"
                          onClick={() => setOpenId(entry.id)}
                        >
                          Open
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl">Preflight</h2>
            <p className="text-sm text-muted-foreground">
              Unchecked or missing items for the next {PREFLIGHT_HORIZON_DAYS} days.
            </p>
            {attentionByDay.length === 0 ? (
              <EmptyNote>Nothing waiting on a check right now.</EmptyNote>
            ) : (
              <div className="space-y-4">
                {attentionByDay.map(({ date, rows }) => (
                  <div key={date} className="space-y-2">
                    <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                      {date === today
                        ? "Today"
                        : date === tomorrow
                          ? "Tomorrow"
                          : formatDay(date)}
                    </h3>
                    <ul className="grid gap-2">
                      {rows.map(({ entry, item }) => (
                        <li
                          key={item.id}
                          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${
                            needsAttention(item.status)
                              ? "border-attention-border bg-attention/40"
                              : "border-border bg-card"
                          }`}
                        >
                          <div>
                            <p className="font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.title}
                              {item.note ? ` · ${item.note}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={item.status} />
                            <Button
                              variant="ghost"
                              className="h-11"
                              onClick={() => setOpenId(entry.id)}
                            >
                              Check
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          {TASK_SECTIONS.map(({ key, title }) => {
            const rows = bySection(key);
            return (
              <section key={key} className="space-y-3">
                <h2 className="text-xl">{title}</h2>
                {rows.length === 0 ? (
                  <EmptyNote>Nothing here today.</EmptyNote>
                ) : (
                  <ul className="grid gap-2">
                    {rows.map(({ entry, task }) => (
                      <TaskRow
                        key={task.id}
                        entryId={entry.id}
                        entryTitle={entry.title}
                        task={task}
                        baseDate={entry.date}
                        onOpen={() => setOpenId(entry.id)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}

          <section className="space-y-3">
            <h2 className="text-xl">Sets up a later day</h2>
            {aheadTasks.length === 0 ? (
              <EmptyNote>Nothing to get ahead of today.</EmptyNote>
            ) : (
              <ul className="grid gap-2">
                {aheadTasks.map(({ entry, task }) => (
                  <TaskRow
                    key={task.id}
                    entryId={entry.id}
                    entryTitle={`${entry.title} · for ${formatDay(entry.date)}`}
                    task={task}
                    baseDate={entry.date}
                    onOpen={() => setOpenId(entry.id)}
                  />
                ))}
              </ul>
            )}
          </section>

          {helpItems.length > 0 ? (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-xl">
                <HandHelping className="size-5" /> Needs a second pair of hands
              </h2>
              <ul className="grid gap-2">
                {helpItems.map((eq) => (
                  <li
                    key={eq.id}
                    className="rounded-xl border border-attention-border bg-attention/40 p-3"
                  >
                    <p className="font-medium">{eq.name}</p>
                    <p className="text-sm text-attention-foreground">
                      {eq.location || "Location not set"} — ask early if it's
                      needed soon.
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-xl">Tomorrow</h2>
            {tomorrowEntries.length === 0 ? (
              <EmptyNote>Nothing on the plan for tomorrow yet.</EmptyNote>
            ) : (
              <ul className="grid gap-2">
                {tomorrowEntries.map((entry) => {
                  const open = entry.items.filter((i) =>
                    needsAttention(i.status),
                  ).length;
                  return (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
                    >
                      <div>
                        <p className="font-medium">{entry.title}</p>
                        {open > 0 ? (
                          <p className="flex items-center gap-1.5 text-sm text-attention-foreground">
                            <CircleAlert className="size-4" />
                            {open} item{open > 1 ? "s" : ""} to sort out
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Preflight looks settled.
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        className="h-11"
                        onClick={() => setOpenId(entry.id)}
                      >
                        Open
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      <EntryDialog
        entry={openEntry}
        open={!!openEntry}
        onOpenChange={(v) => !v && setOpenId(null)}
      />
    </Shell>
  );
}

function TaskRow({
  entryId,
  entryTitle,
  task,
  baseDate,
  onOpen,
}: {
  entryId: string;
  entryTitle: string;
  task: PlanEntry["tasks"][number];
  baseDate: string;
  onOpen: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
      <Checkbox
        checked={task.done}
        onCheckedChange={() => toggleTask(entryId, task.id)}
        className="size-6"
        aria-label={task.text}
      />
      <div className="min-w-40 flex-1">
        <p className={task.done ? "text-muted-foreground line-through" : ""}>
          {task.text}
        </p>
        <p className="text-xs text-muted-foreground">
          {entryTitle}
          {task.keeps ? <span className="italic"> · {task.keeps}</span> : null}
        </p>
      </div>
      <div className="flex gap-2">
        <DeferButton
          current={task.doDate ?? baseDate}
          onPick={(doDate) => patchTask(entryId, task.id, { doDate })}
        />
        <Button variant="ghost" className="h-11" onClick={onOpen}>
          Details
        </Button>
      </div>
    </li>
  );
}

function DeferButton({
  current,
  onPick,
}: {
  current: string;
  onPick: (date: string) => void;
}) {
  const today = useToday();
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  // Defer counts from today, or from the task's current day if that's later.
  const from = current > today ? current : today;
  const pick = (d: string) => {
    onPick(d);
    setOpen(false);
    setPicking(false);
  };
  const quick: [string, number][] = [
    ["Tomorrow", 1],
    ["In 2 days", 2],
    ["In 3 days", 3],
    ["Next week", 7],
  ];
  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setPicking(false);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-11">
          Defer
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-2">
        {picking ? (
          <Calendar
            mode="single"
            selected={undefined}
            disabled={(d) => dayKey(d) <= today}
            onSelect={(d) => d && pick(dayKey(d))}
          />
        ) : (
          <div className="grid min-w-44 gap-1">
            {quick.map(([label, n]) => (
              <Button
                key={label}
                variant="ghost"
                className="h-11 justify-start"
                onClick={() => pick(addDays(from, n))}
              >
                {label}
              </Button>
            ))}
            <Button
              variant="ghost"
              className="h-11 justify-start"
              onClick={() => setPicking(true)}
            >
              Pick a date…
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
