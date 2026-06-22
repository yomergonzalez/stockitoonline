# Inventario POS — stockitoonline

Mobile-first inventory counter for a Nespresso point-of-sale. Count machines by
**category → model → brand → color**, track extra products (capsules, sleeves, packs…), and
export a summary to **WhatsApp**, the **clipboard**, or a generated **PDF**.

🔗 Live: **https://stockito.online**

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build & deploy

```bash
npm run build        # -> dist/
./deploy/push.sh     # build + rsync dist/ to the VPS
```

## Tech

Vite + React + Tailwind CSS v4 + lucide-react. No backend — counts persist in the browser via
`localStorage`. The PDF export is generated client-side with no dependencies.

See [CLAUDE.md](CLAUDE.md) for architecture notes and gotchas.
