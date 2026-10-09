import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  CalendarDays,
  ChefHat,
  ClipboardList,
  ListTodo,
  Sparkles,
  ListChecks,
  Rocket,
  Settings,
  ShoppingBasket,
  Sun,
  Wrench,
} from "lucide-react";

const NAV = [
  { to: "/", label: "Today", icon: Sun },
  { to: "/plan", label: "Plan", icon: CalendarDays },
  { to: "/meals", label: "Meals", icon: ChefHat },
  { to: "/missions", label: "Missions", icon: Rocket },
  { to: "/equipment", label: "Equipment", icon: Wrench },
  { to: "/needs", label: "Needs", icon: ListChecks },
  { to: "/grocery", label: "Groceries", icon: ShoppingBasket },
  { to: "/todo", label: "To-do", icon: ListTodo },
  { to: "/chores", label: "Chores", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

/** Needs, Groceries and To-do share one "Lists" tab on phones. */
const LIST_PATHS = ["/needs", "/grocery", "/todo"] as const;
const LIST_TABS = [
  { to: "/needs", label: "Needs" },
  { to: "/grocery", label: "Groceries" },
  { to: "/todo", label: "To-do" },
] as const;

function isListPath(p: string) {
  return (LIST_PATHS as readonly string[]).includes(p);
}

export function Shell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onList = isListPath(pathname);
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <header className="border-b border-border/70 bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 md:px-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-sm text-muted-foreground">
                Kitchen Plan
              </p>
              <h1 className="text-2xl md:text-3xl">{title}</h1>
              {subtitle ? (
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            {action}
          </div>
          <nav className="hidden gap-1 md:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary"
                activeProps={{
                  className: "bg-secondary text-secondary-foreground font-medium",
                }}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
        {onList ? (
          <nav
            aria-label="Lists"
            className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1 md:hidden"
          >
            {LIST_TABS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="flex min-h-11 items-center justify-center rounded-lg text-sm text-muted-foreground"
                activeProps={{ className: "bg-card text-foreground font-medium shadow-sm" }}
              >
                {label}
              </Link>
            ))}
          </nav>
        ) : null}
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-4">
          {NAV.filter(({ to }) => !isListPath(to)).map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] text-muted-foreground"
              activeProps={{ className: "text-primary font-semibold" }}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
          <Link
            to="/needs"
            className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] ${
              onList ? "text-primary font-semibold" : "text-muted-foreground"
            }`}
          >
            <ClipboardList className="size-5" />
            Lists
          </Link>
        </div>
      </nav>
    </div>
  );
}
