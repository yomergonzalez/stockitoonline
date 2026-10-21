# stockitoonline

## What this is

A single-page **Nespresso POS inventory counter** ("Inventario POS") — a mobile-first React app
for counting coffee machines by **category → model → brand → color**, plus free-form "other
products", with **WhatsApp / clipboard / PDF** export of a summary. The whole app is one
component, [src/InventarioNespresso.tsx](src/InventarioNespresso.tsx). UI text is in Spanish.

Live at **https://stockito.online**.

## Stack

- **Vite 6** + **React 18** + **TypeScript** (the component itself is untyped JSX-in-a-`.tsx`).
- **Tailwind CSS v4** via the `@tailwindcss/vite` plugin — there is **no `tailwind.config`**;
  styling is `@import "tailwindcss"` in [src/index.css](src/index.css) plus inline `style={}` objects.
- **lucide-react** icons.
- No backend, no router, no Redux. Persistence is `localStorage`. The PDF is built by hand with
  no dependency (`makeInventoryPdf`).

## Layout

- [src/InventarioNespresso.tsx](src/InventarioNespresso.tsx) — the entire app: data model
  (`CATEGORIES` → models → brands → color keys), counters, the GESIMO summary modal, and the
  WhatsApp/clipboard/PDF export builders.
- [src/main.tsx](src/main.tsx) — entry point. Mounts the component and installs the
  `window.storage` → `localStorage` shim (see Gotchas).
- [src/index.css](src/index.css) — Tailwind import + base styles.
- [src/global.d.ts](src/global.d.ts) — declares `window.storage` so editors don't flag it.
- [index.html](index.html) — Vite HTML shell.
- [deploy/](deploy/) — `push.sh` (build + rsync to the VPS) and `nginx-stockito.online.conf`
  (a copy of the server's nginx vhost, for reference).

## Commands

```bash
npm install        # installs from the public npm registry (see Gotchas)
npm run dev        # dev server -> http://localhost:5173
npm run build      # production build -> dist/
npm run preview    # serve the production build locally
```

## Deploy

**GitHub Pages (free, current target):** [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
builds and publishes `dist/` on every push to `main` (repo must be public, Settings → Pages →
Source: GitHub Actions). `vite.config.ts` uses `base: "./"` so the same build works at
`yomergonzalez.github.io/stockitoonline/` and at a custom root domain. The app is a PWA
(`public/manifest.webmanifest`, `public/sw.js` network-first offline cache, icons in `public/`)
so it can be installed on iPhone via Safari → Share → Add to Home Screen.

**Legacy VPS deploy:**

The app is a **static SPA** served by **nginx** on a DigitalOcean VPS (`178.62.204.145`,
Ubuntu 24.04), sharing the box with another site (`migrantis.es`) via name-based virtual hosting.
To ship a change:

```bash
./deploy/push.sh   # npm run build + rsync dist/ to root@178.62.204.145:/var/www/stockito.online
```

- HTTPS is a **Let's Encrypt** cert (auto-renewing) covering `stockito.online` + `www.stockito.online`.
- nginx vhost on the server: `/etc/nginx/sites-available/stockito.online` (mirror kept in
  `deploy/`); SPA fallback is `try_files $uri $uri/ /index.html`.
- DNS is managed at **Namecheap** (two A records for `@` and `www` → the VPS IP).

## Gotchas

- **`.npmrc` pins the public npm registry on purpose.** This machine's global npm points at a
  corporate Artifactory that hangs for this project; [.npmrc](.npmrc) overrides it with
  `registry=https://registry.npmjs.org/`. Keep that file.
- **`window.storage` is shimmed in [src/main.tsx](src/main.tsx).** The component was authored for
  an "artifacts" sandbox that provides `window.storage`; in a real browser it's `undefined`, so
  `main.tsx` backs it with `localStorage` (keys `conteo-actual` for the live count + reviewed models, `conteo-historial` for up to 30 saved past counts). **Do not rewrite the component to
  call `localStorage` directly** — the shim keeps the component portable and untouched.
- **The build intentionally skips type-checking.** `npm run build` is just `vite build` (esbuild).
  The component is plain untyped JS inside a `.tsx`, so a `tsc` typecheck would fail on implicit
  `any` — do **not** add `tsc -b` to the build script.
- **Data is per-browser.** `localStorage` is not synced across devices; each phone/browser keeps
  its own counts.
