# minimal-todo

A minimal, self-hostable todo list. **No account, no database, no backend** —
your tasks live entirely in your browser (IndexedDB). Deploy it once and it just
works, anywhere static files can be served.

- ✅ Flat task list with drag-to-reorder
- ✅ Notes per task
- ✅ Scheduled times + recurrence (daily / weekdays / weekly / monthly)
- ✅ Completed-tasks history with restore
- ✅ Export / import your data as JSON (the backup + device-migration story)
- ✅ Best-effort browser reminders while the app is open
- ✅ Light & dark, mobile-friendly
- ✅ 100% static build — zero environment variables, zero services to provision

## One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/minimal-todo)

> Replace `YOUR_USERNAME` once you push the repo to GitHub.

It builds to a fully static site (`output: "export"`), so it also drops onto
Netlify, Cloudflare Pages, GitHub Pages, or any S3/CDN bucket with no config.

## Run locally

```sh
npm install
npm run dev        # http://localhost:3000
```

Production build (emits a static site to `out/`):

```sh
npm run build
npm run start      # serves ./out via `npx serve`
```

## How it works

There is no server. The whole thing is a single static page plus a small client:

| Concern | Where |
| --- | --- |
| Data model (flat tasks) | `lib/types.ts` |
| State engine (immer reducer) | `lib/reducer.ts` |
| Persistence (IndexedDB) | `lib/store.ts` |
| Recurrence math (pure) | `lib/recurrence.ts` |
| UI | `components/` |

State is held in an [immer](https://immerjs.github.io/immer/) reducer, hydrated
from and saved to IndexedDB via [`idb-keyval`](https://github.com/jakearchibald/idb-keyval).
Editing a task writes locally and persists (debounced) — that's the entire data
flow.

### Your data is yours

Everything stays in *your* browser's IndexedDB. Clearing site data wipes it, and
it does not sync across devices — use **Export** to back up or move to another
browser. Nothing is ever sent anywhere.

### About reminders

A static site can't push a notification to a closed tab — that needs a server.
Reminders here are **best-effort**: scheduled times and recurrence are shown and
sorted, and the browser `Notification` API fires for due tasks *while the app is
open*. For true background reminders, add a serverless cron + web-push (kept out
of scope to preserve the zero-dependency, one-click deploy).

## Tech

Next.js (static export) · React · TypeScript · Tailwind CSS · dnd-kit · Tiptap-free
(plain-text notes) · idb-keyval · immer. No runtime dependencies, no env vars.

## License

MIT
