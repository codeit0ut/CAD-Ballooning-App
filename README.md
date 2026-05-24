# ballooning-mini

A standalone web app for **engineering drawing ballooning** — annotate PDF drawings with numbered callouts, tie them to a characteristics table, and persist everything locally.

Ballooning is how quality teams map dimensions and notes on a CAD print to inspection data. This project focuses on that workflow: load a PDF, place and style balloons on the sheet, maintain a linked feature list, and save the diagram for later edits.

## What you can do

- Upload and view multi-page PDF drawings in the browser
- Place, drag, and resize balloon pins with optional leader lines and highlight regions
- Customize pin shape (circle, square, hex, diamond, triangle), colors, and sizes
- Build a **characteristics table** (nominal, tolerances, units, GD&T types) keyed to balloon numbers
- Add free-form drawing notes anchored on the page
- List, search, create, and delete saved ballooning diagrams

Coordinates are stored in **normalized page space** (0–1 per page), so annotations stay aligned when zooming or resizing the viewport. Legacy percent-based data is migrated automatically on load.

## Tech stack

| Layer | Choices |
| --- | --- |
| Framework | [React Router](https://reactrouter.com/) 7 (SSR) · React 18 · TypeScript |
| PDF | [react-pdf](https://github.com/wojtekmaj/react-pdf) · PDF.js |
| Canvas overlay | [Konva](https://konvajs.org/) · react-konva |
| Persistence | SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| UI | Tailwind CSS · Zod validation |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Routes (React Router loaders/actions)                  │
│    quality list · diagram editor · PDF upload API       │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  ballooning module (service → repository)               │
│    Zod models · content migration · business rules        │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  SQLite  data/ballooning.db  (quality_document table)   │
└─────────────────────────────────────────────────────────┘

Editor UI: PDF.js viewport (base layer) + Konva Stage overlay (balloons, notes)
```

The app mirrors the layering used in a larger ERP quality module (repository → service → routes) but runs as a self-contained demo with a stub auth layer (single demo tenant).

## Getting started

**Requirements:** Node.js 20+ and a C++ toolchain for `better-sqlite3` native bindings (`build-essential` on Linux, Xcode CLT on macOS).

```bash
git clone https://github.com/codeit0ut/CAD-Ballooning-App.git
cd CAD-Ballooning-App   # or your clone directory name

npm install
npm run dev
```

Open the URL printed in the terminal (typically `http://localhost:5173`). The app redirects to the ballooning diagram list.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run typecheck` | Run TypeScript without emit |

### First-run flow

1. Go to **Quality → Ballooning** and create a new diagram.
2. Open the diagram, upload a PDF, and switch to edit mode.
3. Click the drawing to add balloons; use the toolbar for pin style, colors, and leader lines.
4. Fill in the characteristics table on the right; numbers stay in sync with balloon labels.
5. Save — data is written to `data/ballooning.db` and PDFs to `public/uploads/ballooning/`.

Uploaded files and the database are gitignored; each environment starts fresh unless you copy `data/` and `public/uploads/` locally.

## Project layout

```
app/
├── modules/ballooning/     # Domain types, service, migration, editor UI
│   ├── hooks/              # Page-space coords, annotation state
│   └── ui/                 # PDF viewport, Konva overlay, table, forms
├── db/                     # SQLite client and repository
├── routes/x/               # Quality list, diagram CRUD, PDF upload
└── server/auth.server.ts   # Demo auth stub (single company/user)
```

## Scope and limitations

This is a **focused extract** of a production ballooning feature, not a full QMS:

- No real authentication or multi-tenant isolation (demo company/user only)
- No cloud sync, approvals, or ERP integrations
- PDF export with burned-in balloons is not included in this mini build

It is intended to demonstrate PDF + canvas interaction, normalized geometry, and a clean module boundary you can study or extend.

## License

[MIT](LICENSE) — Copyright (c) 2026 Atharv
