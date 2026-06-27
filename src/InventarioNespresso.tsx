import { useState, useEffect } from "react";
import { Minus, Plus, Coffee, RotateCcw, ClipboardList, Check, X, Trash2, Package, Send, Image as ImageIcon } from "lucide-react";

/* ── Estructura real: modelo → marca → colores ─────────────── */
const ORIGINAL_MODELS = [
  { name: "Essenza Mini", krups: ["Blanca", "Negra", "Gris"], delonghi: ["Negra", "Lima", "Roja"] },
  { name: "Inissia", krups: ["Blanca", "Roja"], delonghi: ["Crema", "Negra"] },
  { name: "Pixie", krups: [], delonghi: [] },
  { name: "CitiZ", krups: [], delonghi: [] },
  { name: "Lattissima Touch", delonghi: [] },
  { name: "Lattissima One", delonghi: [] },
];
const VERTUO_MODELS = [
  { name: "Pop", krups: ["Blanca", "Roja", "Mint"], delonghi: ["Negra", "Azul", "Mango"] },
  { name: "Next", krups: ["Roja", "Premium Negro", "Gris claro", "Negro mate"], delonghi: ["Gris oscuro", "Blanca", "Negro mate", "Premium Marrón"] },
  { name: "Plus", krups: ["Blanca", "Negra"], delonghi: ["Roja", "Negra"] },
  { name: "Lattissima", delonghi: ["Blanca", "Negra"] },
  { name: "Bundle Pop + Travel Mug", nespresso: ["Blanca", "Negra"] },
  { name: "Vertuo Up", nespresso: ["BLK", "Blue", "White", "Gris"] },
];

const CATEGORIES = [
  {
    id: "original",
    name: "Original",
    accent: "#D9741A",
    accentDeep: "#9C4E0C",
    soft: "#FCE9D2",
    grad: "linear-gradient(135deg,#F2A23C,#D9741A)",
    models: ORIGINAL_MODELS,
  },
  {
    id: "vertuo",
    name: "Vertuo",
    accent: "#C42E63",
    accentDeep: "#8C1E47",
    soft: "#FBDEEA",
    grad: "linear-gradient(135deg,#E4629A,#C42E63)",
    models: VERTUO_MODELS,
  },
];

const BRANDS = [
  { id: "krups", label: "Krups" },
  { id: "delonghi", label: "De'Longhi" },
  { id: "nespresso", label: "Nespresso" },
];

const EXTRA = {
  accent: "#138A72",
  accentDeep: "#0B5E4E",
  soft: "#D3EFE8",
  grad: "linear-gradient(135deg,#34B79C,#138A72)",
};

const STORAGE_KEY = "conteo-actual";
const HEADER_GRAD = "linear-gradient(135deg,#E8842A 0%,#C42E63 100%)";

const INK = "#241A16";
const PAPER = "#F5F2EC";
const SURFACE = "#FFFFFF";
const LINE = "#ECE5DB";
const MUTED = "#948A7C";

/* colores de un modelo+marca; null = no existe; [""] = contador único */
const keysFor = (model, bId) =>
  Array.isArray(model[bId]) ? (model[bId].length ? model[bId] : [""]) : null;

const buildCounts = (prev = {}) => {
  const c = {};
  for (const cat of CATEGORIES) {
    c[cat.id] = {};
    for (const model of cat.models) {
      c[cat.id][model.name] = {};
      for (const b of BRANDS) {
        const keys = keysFor(model, b.id);
        if (!keys) continue;
        c[cat.id][model.name][b.id] = {};
        for (const k of keys) {
          const pv = prev?.[cat.id]?.[model.name]?.[b.id]?.[k];
          c[cat.id][model.name][b.id][k] = Number.isFinite(Number(pv)) ? Number(pv) : 0;
        }
      }
    }
  }
  return c;
};

const buzz = () => {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(6);
  } catch (e) {}
};

function AddInput({ value, onChange, onCancel, onAdd, accent, grad, placeholder }) {
  return (
    <div style={{ background: SURFACE, border: `1.5px solid ${accent}` }} className="rounded-2xl px-3 py-3 flex items-center gap-2">
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onAdd(); if (e.key === "Escape") onCancel(); }}
        placeholder={placeholder}
        className="inp flex-1 rounded-lg px-3 py-2"
        style={{ border: `1px solid ${LINE}`, background: PAPER, color: INK, fontSize: "16px" }}
      />
      <button onClick={onAdd} className="linkbtn rounded-lg px-3 py-2 text-sm font-semibold" style={{ background: grad, color: "#fff" }}>Añadir</button>
      <button aria-label="Cancelar" onClick={onCancel} className="linkbtn p-2 rounded-lg" style={{ color: MUTED }}><X size={18} /></button>
    </div>
  );
}

export default function InventarioNespresso() {
  const [counts, setCounts] = useState(() => buildCounts());
  const [extras, setExtras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [removeExtraName, setRemoveExtraName] = useState(null);
  const [addingExtra, setAddingExtra] = useState(false);
  const [newName, setNewName] = useState("");
  const [copied, setCopied] = useState(false);
  const [imgDone, setImgDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (typeof window !== "undefined" && window.storage) {
          const res = await window.storage.get(STORAGE_KEY);
          if (res && res.value) {
            const p = JSON.parse(res.value);
            setCounts(buildCounts(p.counts || {}));
            setExtras(Array.isArray(p.extras) ? p.extras : []);
            if (p.savedAt) setSavedAt(p.savedAt);
          }
        }
      } catch (e) {} finally { setLoading(false); }
    })();
  }, []);

  const persist = (nextCounts, nextExtras) => {
    setCounts(nextCounts);
    setExtras(nextExtras);
    const stamp = new Date().toISOString();
    setSavedAt(stamp);
    (async () => {
      try {
        if (typeof window !== "undefined" && window.storage) {
          await window.storage.set(STORAGE_KEY, JSON.stringify({ counts: nextCounts, extras: nextExtras, savedAt: stamp }));
        }
      } catch (e) {}
    })();
  };

  const bump = (catId, mName, bId, k, delta) => {
    const next = JSON.parse(JSON.stringify(counts));
    next[catId][mName][bId][k] = Math.max(0, (next[catId][mName][bId][k] || 0) + delta);
    persist(next, extras);
    buzz();
  };

  const bumpExtra = (name, delta) => {
    const next = extras.map((e) => (e.name === name ? { ...e, qty: Math.max(0, e.qty + delta) } : e));
    persist(counts, next);
    buzz();
  };
  const addExtra = () => {
    const name = newName.trim();
    if (name && !extras.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
      persist(counts, [...extras, { name, qty: 0 }]);
    }
    setNewName(""); setAddingExtra(false);
  };
  const removeExtra = (name) => { persist(counts, extras.filter((e) => e.name !== name)); setRemoveExtraName(null); };

  const doReset = () => { persist(buildCounts(), extras.map((e) => ({ ...e, qty: 0 }))); setShowReset(false); };

  const brandTotal = (catId, model, bId) => {
    const keys = keysFor(model, bId);
    if (!keys) return 0;
    return keys.reduce((s, k) => s + (counts[catId][model.name][bId][k] || 0), 0);
  };
  const modelTotal = (catId, model) =>
    BRANDS.reduce((s, b) => s + (keysFor(model, b.id) ? brandTotal(catId, model, b.id) : 0), 0);
  const catTotal = (cat) => cat.models.reduce((s, m) => s + modelTotal(cat.id, m), 0);
  const grandTotal = CATEGORIES.reduce((s, c) => s + catTotal(c), 0);
  const extrasTotal = extras.reduce((s, e) => s + e.qty, 0);

  const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  const savedTime = savedAt ? new Date(savedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : null;

  /* línea de marca para texto: "Krups: Blanca 2 · Negra 2" o "Krups 5" */
  const brandLine = (catId, model, bId) => {
    const keys = keysFor(model, bId);
    if (!keys) return null;
    const label = BRANDS.find((b) => b.id === bId).label;
    if (keys.length === 1 && keys[0] === "") return `${label} ${counts[catId][model.name][bId][""] || 0}`;
    return `${label}: ${keys.map((k) => `${k} ${counts[catId][model.name][bId][k] || 0}`).join(" · ")}`;
  };
  const modelBrands = (model) => BRANDS.filter((b) => Array.isArray(model[b.id]));
  const allSingle = (model) => modelBrands(model).every((b) => model[b.id].length === 0);

  const buildPlainText = () => {
    const L = [`INVENTARIO POS — ${today}`, ""];
    for (const cat of CATEGORIES) {
      L.push(`${cat.name.toUpperCase()} (${catTotal(cat)} máquinas)`);
      for (const model of cat.models) {
        if (allSingle(model)) {
          const parts = modelBrands(model).map((b) => `${b.label} ${counts[cat.id][model.name][b.id][""] || 0}`);
          L.push(`· ${model.name}: ${parts.join(" · ")}`);
        } else {
          L.push(`· ${model.name} (${modelTotal(cat.id, model)})`);
          for (const b of modelBrands(model)) L.push(`   ${brandLine(cat.id, model, b.id)}`);
        }
      }
      L.push("");
    }
    L.push(`TOTAL MÁQUINAS: ${grandTotal}`);
    if (extras.length) { L.push("", "OTROS PRODUCTOS"); for (const e of extras) L.push(`· ${e.name}: ${e.qty}`); }
    return L.join("\n");
  };

  const buildWhatsAppText = () => {
    const L = [`*INVENTARIO POS* — ${today}`, ""];
    for (const cat of CATEGORIES) {
      L.push(`*${cat.name.toUpperCase()}* (${catTotal(cat)} máquinas)`);
      for (const model of cat.models) {
        if (allSingle(model)) {
          const parts = modelBrands(model).map((b) => `${b.label} ${counts[cat.id][model.name][b.id][""] || 0}`);
          L.push(`• ${model.name}: ${parts.join(" · ")}`);
        } else {
          L.push(`• *${model.name}* (${modelTotal(cat.id, model)})`);
          for (const b of modelBrands(model)) L.push(`   ${brandLine(cat.id, model, b.id)}`);
        }
      }
      L.push("");
    }
    L.push(`*Total máquinas: ${grandTotal}*`);
    if (extras.length) { L.push("", "*OTROS PRODUCTOS*"); for (const e of extras) L.push(`• ${e.name}: ${e.qty}`); }
    return L.join("\n");
  };

  /* ── Imagen del resumen (canvas, sin dependencias) ───────── */
  const makeInventoryImage = () => {
    const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    const W = 760, PADX = 28;
    const HEAD = 176, TOPGAP = 10, BOTTOM = 10;
    const H_SEC = 50, H_SINGLE = 42, H_MHEAD = 42, H_BLINE = 30, H_TOTAL = 64, H_XROW = 40, H_FOOT = 58;

    // 1) lista de filas a pintar + medida de altura
    const items = [];
    for (const cat of CATEGORIES) {
      items.push({ k: "sec", h: H_SEC, cat });
      for (const model of cat.models) {
        if (allSingle(model)) items.push({ k: "single", h: H_SINGLE, cat, model });
        else {
          items.push({ k: "mhead", h: H_MHEAD, cat, model });
          for (const b of modelBrands(model)) items.push({ k: "bline", h: H_BLINE, cat, model, b });
        }
      }
      items.push({ k: "gap", h: 10 });
    }
    items.push({ k: "total", h: H_TOTAL });
    if (extras.length) {
      items.push({ k: "gap", h: 10 });
      items.push({ k: "xsec", h: H_SEC });
      for (const e of extras) items.push({ k: "xrow", h: H_XROW, e });
    }
    items.push({ k: "foot", h: H_FOOT });
    const contentH = items.reduce((s, it) => s + it.h, 0);
    const H = HEAD + TOPGAP + contentH + BOTTOM;

    // 2) canvas a 2x para nitidez
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.textBaseline = "middle";

    const rr = (x, y, w, h, r) => {
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };
    const pill = (xRight, cy, text, bg, fg) => {
      ctx.font = `700 13px ${FONT}`;
      const tw = ctx.measureText(text).width;
      const pw = tw + 22, ph = 26, x = xRight - pw, y = cy - ph / 2;
      ctx.fillStyle = bg; rr(x, y, pw, ph, 13); ctx.fill();
      ctx.fillStyle = fg; ctx.textAlign = "center";
      ctx.fillText(text, x + pw / 2, cy + 1);
    };
    const hair = (y) => {
      ctx.strokeStyle = LINE; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PADX, y + 0.5); ctx.lineTo(W - PADX, y + 0.5); ctx.stroke();
    };

    // fondo: tarjeta blanca con esquinas redondeadas
    ctx.clearRect(0, 0, W, H);
    rr(0, 0, W, H, 26); ctx.save(); ctx.clip();
    ctx.fillStyle = SURFACE; ctx.fillRect(0, 0, W, H);

    // cabecera con degradado
    const g = ctx.createLinearGradient(0, 0, W, HEAD);
    g.addColorStop(0, "#E8842A"); g.addColorStop(1, "#C42E63");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, HEAD);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left"; ctx.font = `700 14px ${FONT}`;
    ctx.fillText("INVENTARIO POS", PADX, 40);
    ctx.textAlign = "right"; ctx.font = `400 13px ${FONT}`;
    ctx.globalAlpha = 0.9; ctx.fillText(today, W - PADX, 40); ctx.globalAlpha = 1;
    ctx.textAlign = "left"; ctx.font = `700 54px ${FONT}`;
    ctx.fillText(String(grandTotal), PADX, 112);
    ctx.font = `400 13px ${FONT}`; ctx.globalAlpha = 0.9;
    ctx.fillText("máquinas en total", PADX, 148); ctx.globalAlpha = 1;
    let cy = 92;
    ctx.textAlign = "right";
    for (const c of CATEGORIES) {
      ctx.font = `700 16px ${FONT}`; ctx.fillText(c.name, W - PADX - 42, cy);
      ctx.font = `700 16px ${FONT}`; ctx.fillText(String(catTotal(c)), W - PADX, cy);
      cy += 26;
    }

    // contenido
    let y = HEAD + TOPGAP;
    for (const it of items) {
      const mid = y + it.h / 2;
      if (it.k === "sec" || it.k === "xsec") {
        const accent = it.k === "sec" ? it.cat.accent : EXTRA.accent;
        const soft = it.k === "sec" ? it.cat.soft : EXTRA.soft;
        const deep = it.k === "sec" ? it.cat.accentDeep : EXTRA.accentDeep;
        const label = it.k === "sec" ? it.cat.name.toUpperCase() : "OTROS PRODUCTOS";
        const tot = it.k === "sec" ? catTotal(it.cat) : extrasTotal;
        ctx.textAlign = "left"; ctx.font = `700 15px ${FONT}`; ctx.fillStyle = accent;
        ctx.fillText(label, PADX, mid + 6);
        pill(W - PADX, mid + 6, String(tot), soft, deep);
      } else if (it.k === "single") {
        ctx.textAlign = "left"; ctx.font = `600 15px ${FONT}`; ctx.fillStyle = INK;
        ctx.fillText(it.model.name, PADX, mid);
        const t = modelTotal(it.cat.id, it.model);
        ctx.textAlign = "right"; ctx.font = `700 15px ${FONT}`; ctx.fillStyle = t ? it.cat.accent : MUTED;
        ctx.fillText(String(t), W - PADX, mid);
        const tw = ctx.measureText(String(t)).width;
        const parts = modelBrands(it.model).map((b) => `${b.label} ${counts[it.cat.id][it.model.name][b.id][""] || 0}`).join("   ·   ");
        ctx.font = `400 13px ${FONT}`; ctx.fillStyle = MUTED;
        ctx.fillText(parts, W - PADX - tw - 16, mid);
        hair(y + it.h);
      } else if (it.k === "mhead") {
        ctx.textAlign = "left"; ctx.font = `700 15px ${FONT}`; ctx.fillStyle = INK;
        ctx.fillText(it.model.name, PADX, mid);
        const t = modelTotal(it.cat.id, it.model);
        ctx.textAlign = "right"; ctx.font = `700 15px ${FONT}`; ctx.fillStyle = t ? it.cat.accent : MUTED;
        ctx.fillText(String(t), W - PADX, mid);
      } else if (it.k === "bline") {
        ctx.textAlign = "left"; ctx.font = `400 14px ${FONT}`; ctx.fillStyle = MUTED;
        ctx.fillText(brandLine(it.cat.id, it.model, it.b.id), PADX + 16, mid);
        hair(y + it.h);
      } else if (it.k === "total") {
        rr(PADX, y + 6, W - PADX * 2, it.h - 12, 16); ctx.fillStyle = INK; ctx.fill();
        ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.font = `700 16px ${FONT}`;
        ctx.fillText("Total máquinas", PADX + 18, mid);
        ctx.textAlign = "right"; ctx.font = `700 24px ${FONT}`;
        ctx.fillText(String(grandTotal), W - PADX - 18, mid);
      } else if (it.k === "xrow") {
        ctx.textAlign = "left"; ctx.font = `600 15px ${FONT}`; ctx.fillStyle = INK;
        ctx.fillText(it.e.name, PADX, mid);
        ctx.textAlign = "right"; ctx.font = `700 15px ${FONT}`; ctx.fillStyle = it.e.qty ? EXTRA.accent : MUTED;
        ctx.fillText(String(it.e.qty), W - PADX, mid);
        hair(y + it.h);
      } else if (it.k === "foot") {
        ctx.textAlign = "center"; ctx.font = `400 12px ${FONT}`; ctx.fillStyle = MUTED;
        ctx.fillText(`stockito.online  ·  ${today}`, W / 2, mid);
      }
      y += it.h;
    }
    ctx.restore();

    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  };

  const shareImage = async () => {
    const blob = await makeInventoryImage();
    if (!blob) return;
    const filename = `inventario-${new Date().toISOString().slice(0, 10)}.png`;
    try {
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Inventario POS" });
        return;
      }
    } catch (e) { if (e && e.name === "AbortError") return; }
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setImgDone(true); setTimeout(() => setImgDone(false), 2500);
    } catch (e) {}
  };

  const waUrl = `https://wa.me/?text=${encodeURIComponent(buildWhatsAppText())}`;

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildPlainText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) { setCopied(false); }
  };

  if (loading) {
    return (
      <div style={{ background: PAPER, color: MUTED }} className="min-h-screen flex items-center justify-center text-sm">
        Cargando conteo…
      </div>
    );
  }

  const cancelAdd = () => { setAddingExtra(false); setNewName(""); };

  const renderCounter = (catId, mName, bId, k, grad) => (
    <div className="flex items-center gap-2">
      <button aria-label="Restar" onClick={() => bump(catId, mName, bId, k, -1)}
        className="tapbtn rounded-full flex items-center justify-center"
        style={{ width: 42, height: 42, border: `1.5px solid ${LINE}`, background: "#fff", color: INK }}>
        <Minus size={18} />
      </button>
      <span className="text-xl font-bold text-center" style={{ minWidth: 28, fontVariantNumeric: "tabular-nums" }}>
        {counts[catId][mName][bId][k] || 0}
      </span>
      <button aria-label="Sumar" onClick={() => bump(catId, mName, bId, k, 1)}
        className="tapbtn rounded-full flex items-center justify-center shadow-sm"
        style={{ width: 42, height: 42, background: grad, color: "#fff" }}>
        <Plus size={18} />
      </button>
    </div>
  );

  return (
    <div style={{ background: PAPER, color: INK }} className="min-h-screen">
      <style>{`
        @keyframes pop { 0%{transform:scale(1)} 40%{transform:scale(.84)} 100%{transform:scale(1)} }
        .tapbtn:active { animation: pop .18s ease; }
        .tapbtn:focus-visible, .linkbtn:focus-visible, .inp:focus-visible { outline: 2px solid ${INK}; outline-offset: 2px; }
        .inp { outline: none; }
        @media (prefers-reduced-motion: reduce) { .tapbtn:active { animation: none; } }
      `}</style>

      <div className="max-w-md mx-auto px-4 pb-32">
        {/* Cabecera */}
        <div className="sticky top-0 z-10 pt-4 pb-3" style={{ background: PAPER }}>
          <div className="rounded-2xl px-5 pt-4 pb-4 shadow-md" style={{ background: HEADER_GRAD, color: "#fff" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coffee size={18} />
                <span className="text-xs font-bold uppercase" style={{ letterSpacing: "0.16em" }}>Inventario POS</span>
              </div>
              <span className="text-xs" style={{ opacity: 0.85 }}>{today}</span>
            </div>
            <div className="flex items-end justify-between mt-2">
              <div className="leading-none font-bold" style={{ fontSize: "3rem", fontVariantNumeric: "tabular-nums" }}>{grandTotal}</div>
              <div className="text-right pb-1">
                {CATEGORIES.map((c) => (
                  <div key={c.id} className="text-xs" style={{ opacity: 0.95 }}>
                    <span style={{ fontWeight: 700 }}>{c.name}</span>{" "}
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{catTotal(c)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-xs mt-1" style={{ opacity: 0.85 }}>máquinas en total{savedTime ? ` · guardado ${savedTime}` : ""}</div>
          </div>
        </div>

        {/* Categorías */}
        {CATEGORIES.map((cat) => (
          <div key={cat.id} className="mb-7">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase" style={{ letterSpacing: "0.12em", color: cat.accent }}>{cat.name}</span>
                <span className="rounded-full" style={{ width: 26, height: 4, background: cat.grad }} />
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: cat.soft, color: cat.accentDeep, fontVariantNumeric: "tabular-nums" }}>{catTotal(cat)}</span>
            </div>

            <div className="space-y-3">
              {cat.models.map((model) => (
                <div key={model.name} style={{ background: SURFACE, border: `1px solid ${LINE}` }} className="rounded-2xl px-4 pt-3 pb-3 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[15px]">{model.name}</span>
                    <span className="text-sm font-bold px-2 py-0.5 rounded-full" style={{ background: modelTotal(cat.id, model) ? cat.soft : "transparent", color: modelTotal(cat.id, model) ? cat.accentDeep : MUTED, fontVariantNumeric: "tabular-nums", minWidth: 26, textAlign: "center" }}>
                      {modelTotal(cat.id, model)}
                    </span>
                  </div>

                  {BRANDS.map((b) => {
                    const keys = keysFor(model, b.id);
                    if (!keys) return null;
                    const single = keys.length === 1 && keys[0] === "";
                    if (single) {
                      return (
                        <div key={b.id} className="flex items-center justify-between py-1.5">
                          <span className="text-sm" style={{ color: MUTED }}>{b.label}</span>
                          {renderCounter(cat.id, model.name, b.id, "", cat.grad)}
                        </div>
                      );
                    }
                    return (
                      <div key={b.id} className="mt-2">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold uppercase" style={{ letterSpacing: "0.06em", color: MUTED }}>{b.label}</span>
                          <span className="text-xs" style={{ color: MUTED, fontVariantNumeric: "tabular-nums" }}>{brandTotal(cat.id, model, b.id)}</span>
                        </div>
                        {keys.map((k) => (
                          <div key={k} className="flex items-center justify-between py-1">
                            <span className="text-sm">{k}</span>
                            {renderCounter(cat.id, model.name, b.id, k, cat.grad)}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Otros productos */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Package size={16} style={{ color: EXTRA.accent }} />
              <span className="text-sm font-bold uppercase" style={{ letterSpacing: "0.12em", color: EXTRA.accent }}>Otros productos</span>
              <span className="rounded-full" style={{ width: 26, height: 4, background: EXTRA.grad }} />
            </div>
            {extras.length > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: EXTRA.soft, color: EXTRA.accentDeep, fontVariantNumeric: "tabular-nums" }}>{extrasTotal}</span>
            )}
          </div>

          {extras.length === 0 && !addingExtra && (
            <p className="text-xs mb-3 px-1" style={{ color: MUTED }}>Cápsulas, sleeves, tazas, Welcome Packs… lo que necesites contar aparte.</p>
          )}

          <div className="space-y-3">
            {extras.map((e) => (
              <div key={e.name} style={{ background: SURFACE, border: `1px solid ${LINE}` }} className="rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-[15px] truncate">{e.name}</span>
                  <button aria-label={`Quitar ${e.name}`} onClick={() => setRemoveExtraName(e.name)} className="linkbtn p-1 rounded-full flex-shrink-0" style={{ color: MUTED }}><Trash2 size={15} /></button>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button aria-label={`Restar ${e.name}`} onClick={() => bumpExtra(e.name, -1)} className="tapbtn rounded-full flex items-center justify-center" style={{ width: 42, height: 42, border: `1.5px solid ${LINE}`, background: "#fff", color: INK }}><Minus size={18} /></button>
                  <span className="text-xl font-bold text-center" style={{ minWidth: 28, fontVariantNumeric: "tabular-nums" }}>{e.qty}</span>
                  <button aria-label={`Sumar ${e.name}`} onClick={() => bumpExtra(e.name, 1)} className="tapbtn rounded-full flex items-center justify-center shadow-sm" style={{ width: 42, height: 42, background: EXTRA.grad, color: "#fff" }}><Plus size={18} /></button>
                </div>
              </div>
            ))}

            {addingExtra ? (
              <AddInput value={newName} onChange={setNewName} onCancel={cancelAdd} onAdd={addExtra} accent={EXTRA.accent} grad={EXTRA.grad} placeholder="Cápsulas, sleeves, packs…" />
            ) : (
              <button onClick={() => { setAddingExtra(true); setNewName(""); }} className="linkbtn w-full rounded-2xl py-3 text-sm font-semibold flex items-center justify-center gap-2" style={{ border: `1.5px dashed ${EXTRA.accent}`, color: EXTRA.accentDeep, background: "transparent" }}>
                <Plus size={17} /> Añadir producto
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barra inferior */}
      <div className="fixed bottom-0 left-0 right-0 z-20" style={{ background: PAPER, borderTop: `1px solid ${LINE}` }}>
        <div className="max-w-md mx-auto px-4 py-3 flex gap-3">
          <button onClick={() => setShowSummary(true)} className="linkbtn flex-1 rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 shadow-sm" style={{ background: INK, color: "#fff" }}>
            <ClipboardList size={17} /> Resumen para GESIMO
          </button>
          <button onClick={() => setShowReset(true)} aria-label="Reiniciar conteo" className="linkbtn rounded-xl px-4 flex items-center justify-center" style={{ background: "#fff", border: `1px solid ${LINE}`, color: INK }}>
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Resumen */}
      {showSummary && (
        <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center" style={{ background: "rgba(36,26,22,0.5)" }} onClick={() => setShowSummary(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: PAPER }} className="w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between px-5 py-4" style={{ background: HEADER_GRAD, color: "#fff" }}>
              <div>
                <div className="font-bold">Resumen para GESIMO</div>
                <div className="text-xs" style={{ opacity: 0.9 }}>{today} · {grandTotal} máquinas</div>
              </div>
              <button onClick={() => setShowSummary(false)} aria-label="Cerrar" className="rounded-full p-1" style={{ color: "#fff" }}><X size={22} /></button>
            </div>

            <div className="px-5 py-4 space-y-5">
              {CATEGORIES.map((cat) => (
                <div key={cat.id}>
                  <div className="text-xs font-bold uppercase mb-2" style={{ letterSpacing: "0.1em", color: cat.accent }}>{cat.name} · {catTotal(cat)} máquinas</div>
                  <div className="space-y-2">
                    {cat.models.map((model) => {
                      const t = modelTotal(cat.id, model);
                      if (allSingle(model)) {
                        const parts = modelBrands(model).map((b) => `${b.label} ${counts[cat.id][model.name][b.id][""] || 0}`).join("  ·  ");
                        return (
                          <div key={model.name} className="flex items-center justify-between text-sm py-1" style={{ borderBottom: `1px solid ${LINE}`, opacity: t ? 1 : 0.5 }}>
                            <span className="font-medium">{model.name}</span>
                            <span style={{ color: MUTED, fontVariantNumeric: "tabular-nums" }}>{parts} <b style={{ color: t ? cat.accent : MUTED }}>{t}</b></span>
                          </div>
                        );
                      }
                      return (
                        <div key={model.name} style={{ borderBottom: `1px solid ${LINE}`, opacity: t ? 1 : 0.5 }} className="pb-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold">{model.name}</span>
                            <b style={{ color: t ? cat.accent : MUTED, fontVariantNumeric: "tabular-nums" }}>{t}</b>
                          </div>
                          {modelBrands(model).map((b) => (
                            <div key={b.id} className="text-xs mt-0.5" style={{ color: MUTED }}>{brandLine(cat.id, model, b.id)}</div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-1 text-sm font-bold">
                <span>Total máquinas</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{grandTotal}</span>
              </div>

              {extras.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase mb-2" style={{ letterSpacing: "0.1em", color: EXTRA.accent }}>Otros productos · {extrasTotal}</div>
                  {extras.map((e) => (
                    <div key={e.name} className="flex items-center justify-between text-sm py-2" style={{ borderBottom: `1px solid ${LINE}`, opacity: e.qty ? 1 : 0.5 }}>
                      <span className="font-medium">{e.name}</span>
                      <span className="font-bold" style={{ color: e.qty ? EXTRA.accent : MUTED, fontVariantNumeric: "tabular-nums" }}>{e.qty}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 pb-6 pt-1">
              <div className="flex gap-3">
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="linkbtn flex-1 rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2" style={{ background: "#25D366", color: "#fff", textDecoration: "none" }}>
                  <Send size={17} /> WhatsApp
                </a>
                <button onClick={copySummary} className="linkbtn flex-1 rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2" style={{ background: INK, color: "#fff" }}>
                  {copied ? (<><Check size={17} /> Copiado</>) : (<><ClipboardList size={17} /> Copiar</>)}
                </button>
              </div>
              <button onClick={shareImage} className="linkbtn w-full rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 mt-3" style={{ background: HEADER_GRAD, color: "#fff" }}>
                {imgDone ? (<><Check size={17} /> Imagen lista</>) : (<><ImageIcon size={17} /> Descargar imagen</>)}
              </button>
              <p className="text-xs mt-2 text-center" style={{ color: MUTED }}>WhatsApp y Copiar envían texto · Imagen crea un archivo para compartir o guardar.</p>
            </div>
          </div>
        </div>
      )}

      {/* Quitar producto extra */}
      {removeExtraName && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-6" style={{ background: "rgba(36,26,22,0.5)" }} onClick={() => setRemoveExtraName(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: PAPER }} className="w-full max-w-xs rounded-3xl p-6 text-center">
            <div className="font-bold mb-1">¿Quitar "{removeExtraName}"?</div>
            <p className="text-sm mb-5" style={{ color: MUTED }}>Se elimina y se borra su conteo.</p>
            <div className="flex gap-3">
              <button onClick={() => setRemoveExtraName(null)} className="linkbtn flex-1 rounded-xl py-3 font-semibold text-sm" style={{ background: "#fff", border: `1px solid ${LINE}` }}>Cancelar</button>
              <button onClick={() => removeExtra(removeExtraName)} className="linkbtn flex-1 rounded-xl py-3 font-semibold text-sm" style={{ background: "#C42E63", color: "#fff" }}>Quitar</button>
            </div>
          </div>
        </div>
      )}

      {/* Reiniciar */}
      {showReset && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-6" style={{ background: "rgba(36,26,22,0.5)" }} onClick={() => setShowReset(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: PAPER }} className="w-full max-w-xs rounded-3xl p-6 text-center">
            <div className="font-bold mb-1">¿Reiniciar el conteo?</div>
            <p className="text-sm mb-5" style={{ color: MUTED }}>Todos los conteos (máquinas y otros productos) vuelven a 0. No se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowReset(false)} className="linkbtn flex-1 rounded-xl py-3 font-semibold text-sm" style={{ background: "#fff", border: `1px solid ${LINE}` }}>Cancelar</button>
              <button onClick={doReset} className="linkbtn flex-1 rounded-xl py-3 font-semibold text-sm" style={{ background: "#C42E63", color: "#fff" }}>Reiniciar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
