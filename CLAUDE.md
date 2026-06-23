# Course Portal

## Before any task
Read `docs/MASTER.md` and `docs/CONNECTION-MAP.md` in full. They are the single source of truth.
`design/Course Portal.html` is the approved Claude Design export — visual ground truth. Never edit it.

## Binding rules
- MASTER.md §7 (working rules) and CONNECTION-MAP.md §8 (guardrails) are binding.
- Never invent tables, columns, or endpoints beyond MASTER.md §3 and CONNECTION-MAP.md. If something is missing, stop and ask.
- Never alter the visual structure of the ported frontend — only swap fixtures for data hooks (CONNECTION-MAP §1).
- Never self-certify exit tests. At the end of each phase, print the MASTER.md §6 EXIT steps for the human to run manually.
- All GHL credentials live in Edge Function secrets only — never ship them to the browser.
- Every GHL call writes a `ghl_sync_log` row (success or failure).

## Workflow per session
1. Confirm the current phase (below).
2. Read the MASTER.md §6 entry and CONNECTION-MAP.md §7 row for that phase.
3. Plan first: list files to create/modify, wait for human approval before writing code.
4. Build only that phase's scope.
5. Print the EXIT test steps. Stop. Do not start the next phase.
6. On approval, commit with git (message: "phase N complete").

## Git workflow
After verifying any phase passes its EXIT test, Claude Code commits with a descriptive message at every phase gate so work is never lost across machines. The human runs `git push` from their own terminal, where the GitHub credentials live — Claude Code does not push.

## Stack
Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Auth, Postgres, pg_cron + pg_net, Edge Functions) · Vimeo Player API · Vercel. No Video.js. No localStorage in the client.

## Current phase: 3
