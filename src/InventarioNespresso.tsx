import { useState, useEffect } from "react";
import { Minus, Plus, Coffee, RotateCcw, ClipboardList, Check, X, Trash2, Package, Send, FileText } from "lucide-react";

/* ── Estructura real: modelo → marca → colores ─────────────── */
const ORIGINAL_MODELS = [
  { name: "Essenza Mini", krups: ["Blanca", "Negra", "Gris"], delonghi: ["Negra", "Lima", "Roja"] },
  { name: "Inissia", krups: ["Blanca", "Roja"], delonghi: ["Crema", "Negra"] },
  { name: "Pixie", krups: [], delonghi: [] },
  { name: "CitiZ", delonghi: [] },
  { name: "Lattissima One", delonghi: [] },
];
const VERTUO_MODELS = [
  { name: "Pop", krups: ["Blanca", "Roja", "Mint"], delonghi: ["Negra", "Azul", "Mango"] },
  { name: "Next", krups: ["Roja", "Gris claro", "Gris mate"], delonghi: ["Gris oscuro", "Blanca", "Negro mate"] },
  { name: "Vertuo Up", krups: ["Negra", "Azul"], delonghi: ["Blanca", "Antracita"] },
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

/* ── Generador de PDF (sin dependencias) ───────────────────── */
const WINANSI = {
  "á": 0xe1, "é": 0xe9, "í": 0xed, "ó": 0xf3, "ú": 0xfa, "ü": 0xfc, "ñ": 0xf1,
  "Á": 0xc1, "É": 0xc9, "Í": 0xcd, "Ó": 0xd3, "Ú": 0xda, "Ü": 0xdc, "Ñ": 0xd1,
  "¿": 0xbf, "¡": 0xa1, "·": 0xb7, "•": 0x95, "…": 0x85, "—": 0x97, "–": 0x96,
  "€": 0x80, "ª": 0xaa, "º": 0xba,
};
const pdfEscape = (s) => {
  let out = "";
  for (const ch of s) {
    if (ch === "\\") out += "\\\\";
    else if (ch === "(") out += "\\(";
    else if (ch === ")") out += "\\)";
    else {
      const code = ch.charCodeAt(0);
      if (code < 128) out += ch;
      else if (WINANSI[ch] != null) out += "\\" + WINANSI[ch].toString(8).padStart(3, "0");
      else out += "?";
    }
  }
  return out;
};
const makeInventoryPdf = (lines) => {
  const PW = 612, PH = 792, ML = 56, MT = 744, MB = 56;
  const pages = [];
  let cur = [];
  let y = MT;
  for (const ln of lines) {
    const lh = Math.round((ln.s || 11) * 1.5);
    if (y - lh < MB) { pages.push(cur); cur = []; y = MT; }
    cur.push({ ...ln, y });
    y -= lh;
  }
  if (cur.length) pages.push(cur);
  if (!pages.length) pages.push([]);
  const contents = pages.map((pg) => {
    let s = "";
    for (const ln of pg) {
      if (!ln.t) continue;
      const font = ln.b ? "F2" : "F1";
      const col = ln.c ? `${ln.c[0]} ${ln.c[1]} ${ln.c[2]} rg` : "0 0 0 rg";
      s += `BT /${font} ${ln.s || 11} Tf ${col} 1 0 0 1 ${ML} ${ln.y} Tm (${pdfEscape(ln.t)}) Tj ET\n`;
    }
    return s;
  });
  const nPages = pages.length;
  const contentNums = [];
  const pageNums = [];
  let n = 5;
  for (let i = 0; i < nPages; i++) { contentNums.push(n++); pageNums.push(n++); }
  const objs = [];
  objs[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objs[2] = `<< /Type /Pages /Kids [${pageNums.map((p) => `${p} 0 R`).join(" ")}] /Count ${nPages} /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`;
  objs[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  objs[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;
  for (let i = 0; i < nPages; i++) {
    const stream = contents[i];
    objs[contentNums[i]] = `<< /Length ${stream.length} >>\nstream\n${stream}endstream`;
    objs[pageNums[i]] = `<< /Type /Page /Parent 2 0 R /Contents ${contentNums[i]} 0 R >>`;
  }
  const maxObj = objs.length - 1;
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  for (let i = 1; i <= maxObj; i++) { offsets[i] = pdf.length; pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`; }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${maxObj + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= maxObj; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${maxObj + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: "application/pdf" });
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
  const [pdfDone, setPdfDone] = useState(false);

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

  const buildStyledLines = () => {
    const L = [
      { t: "Inventario POS", b: true, s: 18 },
      { t: today, s: 10, c: [0.45, 0.43, 0.4] },
      { t: "", s: 6 },
    ];
    for (const cat of CATEGORIES) {
      L.push({ t: `${cat.name.toUpperCase()}   ·   ${catTotal(cat)} máquinas`, b: true, s: 12 });
      for (const model of cat.models) {
        if (allSingle(model)) {
          const parts = modelBrands(model).map((b) => `${b.label} ${counts[cat.id][model.name][b.id][""] || 0}`);
          L.push({ t: `${model.name}:    ${parts.join("    ·    ")}`, s: 11 });
        } else {
          L.push({ t: `${model.name}   (${modelTotal(cat.id, model)})`, b: true, s: 11 });
          for (const b of modelBrands(model)) L.push({ t: `    ${brandLine(cat.id, model, b.id)}`, s: 10.5 });
        }
      }
      L.push({ t: "", s: 6 });
    }
    L.push({ t: `Total máquinas: ${grandTotal}`, b: true, s: 13 });
    if (extras.length) {
      L.push({ t: "", s: 6 });
      L.push({ t: "OTROS PRODUCTOS", b: true, s: 12 });
      for (const e of extras) L.push({ t: `${e.name}:    ${e.qty}`, s: 11 });
    }
    return L;
  };

  const waUrl = `https://wa.me/?text=${encodeURIComponent(buildWhatsAppText())}`;

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildPlainText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) { setCopied(false); }
  };

  const sharePdf = async () => {
    const blob = makeInventoryPdf(buildStyledLines());
    const filename = `inventario-${new Date().toISOString().slice(0, 10)}.pdf`;
    try {
      const file = new File([blob], filename, { type: "application/pdf" });
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
      setPdfDone(true); setTimeout(() => setPdfDone(false), 2500);
    } catch (e) {}
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
              <button onClick={sharePdf} className="linkbtn w-full rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 mt-3" style={{ background: "#fff", border: `1.5px solid ${INK}`, color: INK }}>
                {pdfDone ? (<><Check size={17} /> PDF descargado</>) : (<><FileText size={17} /> Compartir PDF</>)}
              </button>
              <p className="text-xs mt-2 text-center" style={{ color: MUTED }}>WhatsApp y Copiar envían texto · el PDF crea un archivo para compartir o guardar.</p>
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
