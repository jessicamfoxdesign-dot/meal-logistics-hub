<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Kitchen data lives in Lovable Cloud tables (meals, missions, equipment, plan_entries, needs) as one JSONB `data` row per item, ordered by `seq`; the TS types are the shape source of truth — avoids schema churn when types evolve.
- Access is a single shared dataset gated by `allowed_emails` + `is_allowed()` RLS; the whole app renders behind a client-only AuthGate in __root — sessions live in browser storage.
- store.tsx applies edits optimistically, diffs by object identity, and sends writes through an ordered queue that halts and surfaces failures — no edit is ever silently dropped.
- localStorage `kitchen-plan-v1` (pre-backend data) is read-only forever; the read cache uses `kitchen-plan-cache-v2` — protects un-uploaded device data.
- Template steps are TemplateStep objects (daysAhead, keeps); normalize.ts upgrades legacy string steps on every read (server, cache, import) — old data never breaks.
