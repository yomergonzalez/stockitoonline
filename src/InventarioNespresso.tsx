import { useState, useEffect, useRef } from "react";
import { Minus, Plus, Coffee, RotateCcw, ClipboardList, Check, X, Trash2, Package, Send, Image as ImageIcon, ChevronDown, History, Undo2, CircleCheck, Circle, EyeOff, User, Cloud, CloudOff } from "lucide-react";

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
const HISTORY_KEY = "conteo-historial";
const HISTORY_MAX = 50;
const NICK_KEY = "conteo-apodo";

// URL de la aplicación web de Google Apps Script (ver sheets/LEEME.md).
// Vacía = el historial se queda solo en este teléfono.
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbwWqlXxU3NkUasuwF3z9CRB-zY-EDuY8i3KFkyrQTqaByrC6EeHXvXAlwjXVDUwvo0/exec";

const nickKey = (n) => String(n || "").trim().toLowerCase();

/* llamada al script de Google Sheets; text/plain evita la petición previa de CORS */
const sheetsCall = async (payload) => {
  const res = await fetch(SHEETS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data || !data.ok) throw new Error((data && data.error) || "Error de Google Sheets");
  return data;
};
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

/* totales a partir de un objeto de conteos cualquiera (actual o del historial) */
const modelTotalIn = (c, catId, model) =>
  BRANDS.reduce((s, b) => {
    const keys = keysFor(model, b.id);
    if (!keys) return s;
    return s + keys.reduce((t, k) => t + (Number(c?.[catId]?.[model.name]?.[b.id]?.[k]) || 0), 0);
  }, 0);
const catTotalIn = (c, cat) => cat.models.reduce((s, m) => s + modelTotalIn(c, cat.id, m), 0);

/* filas legibles para la pestaña "Conteos" de la hoja: solo lo que tiene unidades */
const linesOf = (c, ex) => {
  const out = [];
  for (const cat of CATEGORIES) {
    for (const m of cat.models) {
      for (const b of BRANDS) {
        const keys = keysFor(m, b.id);
        if (!keys) continue;
        for (const k of keys) {
          const qty = Number(c?.[cat.id]?.[m.name]?.[b.id]?.[k]) || 0;
          if (qty) out.push({ cat: cat.name, model: m.name, brand: b.label, color: k, qty });
        }
      }
    }
  }
  for (const e of ex || []) if (e.qty) out.push({ cat: "Otros", model: e.name, brand: "", color: "", qty: e.qty });
  return out;
};

const MODEL_COUNT = CATEGORIES.reduce((s, c) => s + c.models.length, 0);
const reviewKey = (catId, mName) => `${catId}/${mName}`;

/* muestra de color para cada nombre de color */
const SWATCHES = {
  "blanca": "#F7F5F0", "white": "#F7F5F0",
  "negra": "#1E1C1B", "blk": "#1E1C1B",
  "gris": "#8E8E93", "gris claro": "#C9CCD1", "gris oscuro": "#4F5359", "gris mate": "#7A7C80",
  "negro mate": "#3A3838", "premium negro": "#2A2522",
  "lima": "#B5D334", "roja": "#C8102E", "crema": "#EFE3C8", "mint": "#9FD8C4",
  "azul": "#2B5BA8", "blue": "#2B5BA8", "mango": "#F4A62A",
  "premium marrón": "#6B4430", "antracita": "#383E42",
};
const swatchFor = (name) => SWATCHES[String(name).toLowerCase()] || null;

function Swatch({ name }) {
  const c = swatchFor(name);
  if (!c) return null;
  const premium = /premium/i.test(name);
  return (
    <span aria-hidden="true" className="inline-block rounded-full flex-shrink-0"
      style={{ width: 14, height: 14, background: c, boxShadow: premium ? "0 0 0 1.5px #C9A45C" : "inset 0 0 0 1.5px rgba(0,0,0,0.28)" }} />
  );
}

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

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
  const [reviewed, setReviewed] = useState({});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [openEntry, setOpenEntry] = useState(null);
  const [removeExtraName, setRemoveExtraName] = useState(null);
  const [addingExtra, setAddingExtra] = useState(false);
  const [newName, setNewName] = useState("");
  const [copied, setCopied] = useState(false);
  const [imgDone, setImgDone] = useState(false);
  const [histDone, setHistDone] = useState(false);
  const [hideZeros, setHideZeros] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [undo, setUndo] = useState(null);
  const [activeSec, setActiveSec] = useState("original");
  const [scrolled, setScrolled] = useState(false);
  const [nick, setNick] = useState("");
  const [showNick, setShowNick] = useState(false);
  const [nickDraft, setNickDraft] = useState("");
  const [syncState, setSyncState] = useState(SHEETS_URL ? "idle" : "off");
  const undoTimer = useRef(null);
  const historyRef = useRef([]);
  const nickRef = useRef("");
  const syncingRef = useRef(false);
  const syncAgainRef = useRef(false);
  const headerRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        if (typeof window !== "undefined" && window.storage) {
          const res = await window.storage.get(STORAGE_KEY);
          if (res && res.value) {
            const p = JSON.parse(res.value);
            setCounts(buildCounts(p.counts || {}));
            setExtras(Array.isArray(p.extras) ? p.extras : []);
            const rv = p.reviewed && typeof p.reviewed === "object" ? p.reviewed : {};
            setReviewed(rv);
            setCollapsed(rv);
            if (p.savedAt) setSavedAt(p.savedAt);
          }
          const h = await window.storage.get(HISTORY_KEY);
          if (h && h.value) {
            const arr = JSON.parse(h.value);
            if (Array.isArray(arr)) {
              const norm = arr.map((x) => ({ ...x, id: String(x.id) }));
              historyRef.current = norm;
              setHistory(norm);
            }
          }
          const n = await window.storage.get(NICK_KEY);
          const savedNick = n && n.value ? String(n.value) : "";
          nickRef.current = savedNick;
          setNick(savedNick);
          if (!savedNick) setShowNick(true);
        }
      } catch (e) {} finally { setLoading(false); }
    })();
  }, []);

  /* sección activa en los accesos rápidos + total compacto al bajar */
  useEffect(() => {
    if (loading) return;
    const onScroll = () => {
      const hb = headerRef.current ? headerRef.current.getBoundingClientRect().bottom : 0;
      setScrolled(hb < 0);
      let cur = "original";
      for (const id of ["original", "vertuo", "otros"]) {
        const el = document.getElementById(`sec-${id}`);
        if (el && el.getBoundingClientRect().top < 140) cur = id;
      }
      const sc = scrollRef.current;
      if (sc && sc.scrollTop > 0 && sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4) cur = "otros";
      setActiveSec(cur);
    };
    onScroll();
    // la lista tiene su propio scroll (ver .app-shell): así Safari no encoge su barra
    // al bajar y la barra inferior no se queda flotando en mitad de la pantalla
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [loading]);

  const persist = (nextCounts, nextExtras, nextReviewed = reviewed) => {
    setCounts(nextCounts);
    setExtras(nextExtras);
    setReviewed(nextReviewed);
    const stamp = new Date().toISOString();
    setSavedAt(stamp);
    (async () => {
      try {
        if (typeof window !== "undefined" && window.storage) {
          await window.storage.set(STORAGE_KEY, JSON.stringify({ counts: nextCounts, extras: nextExtras, reviewed: nextReviewed, savedAt: stamp }));
        }
      } catch (e) {}
    })();
  };

  const persistHistory = (next) => {
    historyRef.current = next;
    setHistory(next);
    (async () => {
      try {
        if (typeof window !== "undefined" && window.storage) await window.storage.set(HISTORY_KEY, JSON.stringify(next));
      } catch (e) {}
    })();
  };

  /* sube a Google Sheets lo pendiente del apodo actual y trae sus conteos */
  const syncNow = async () => {
    const forNick = nickRef.current;
    if (!SHEETS_URL || !forNick) return;
    if (syncingRef.current) { syncAgainRef.current = true; return; }
    syncingRef.current = true;
    setSyncState("syncing");
    const key = nickKey(forNick);
    try {
      const pending = historyRef.current.filter((h) => nickKey(h.nick) === key && !h.synced);
      for (const h of pending) {
        if (h.deleted) await sheetsCall({ action: "delete", nick: forNick, id: h.id });
        else await sheetsCall({ action: "save", nick: forNick, entry: { ...h, synced: undefined, lines: linesOf(h.counts, h.extras) } });
        // si mientras tanto cambió, se queda pendiente para la próxima vuelta
        persistHistory(historyRef.current.flatMap((x) => (x === h ? (h.deleted ? [] : [{ ...h, synced: true }]) : [x])));
      }
      const { entries } = await sheetsCall({ action: "list", nick: forNick });
      if (nickKey(nickRef.current) === key) {
        const cur = historyRef.current;
        const mine = (h) => nickKey(h.nick) === key;
        const localPending = cur.filter((h) => mine(h) && !h.synced);
        const pendingIds = new Set(localPending.map((h) => h.id));
        const remote = (entries || [])
          .map((e) => ({ ...e, id: String(e.id), synced: true }))
          .filter((e) => !pendingIds.has(e.id));
        const rest = cur.filter((h) => !mine(h));
        persistHistory([...remote, ...localPending, ...rest].sort((a, b) => String(b.at).localeCompare(String(a.at))));
      }
      setSyncState("ok");
    } catch (e) {
      setSyncState("error");
    } finally {
      syncingRef.current = false;
      if (syncAgainRef.current) { syncAgainRef.current = false; syncNow(); }
    }
  };

  useEffect(() => {
    if (loading) return;
    syncNow();
    const onOnline = () => syncNow();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [loading]);

  const applyNick = () => {
    const n = nickDraft.trim().slice(0, 30);
    if (n.length < 2) return;
    const first = !nickRef.current;
    nickRef.current = n;
    setNick(n);
    (async () => {
      try { if (window.storage) await window.storage.set(NICK_KEY, n); } catch (e) {}
    })();
    // los conteos guardados antes de tener apodo pasan a ser de este apodo
    if (first) persistHistory(historyRef.current.map((h) => (h.nick ? h : { ...h, nick: n, synced: false })));
    setOpenEntry(null);
    setShowNick(false);
    syncNow();
  };

  /* guarda el estado anterior para poder deshacer el último cambio */
  const remember = (label, createdId = null) => {
    setUndo({ label, createdId, snap: { counts, extras, reviewed, history, collapsed } });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 3000);
  };
  const doUndo = () => {
    if (!undo) return;
    const { snap } = undo;
    persist(snap.counts, snap.extras, snap.reviewed);
    if (snap.history !== history) {
      // lo que cambió vuelve a subirse; lo creado por la acción deshecha se borra también en la hoja
      const cur = historyRef.current;
      const curById = new Map(cur.map((h) => [h.id, h]));
      const snapIds = new Set(snap.history.map((h) => h.id));
      const restored = snap.history.map((h) => (curById.get(h.id) === h ? h : { ...h, synced: false }));
      const extra = cur.flatMap((h) => {
        if (snapIds.has(h.id)) return [];
        if (h.id !== undo.createdId) return [h];
        return h.synced ? [{ ...h, deleted: true, synced: false }] : [];
      });
      persistHistory([...restored, ...extra]);
      syncNow();
    }
    setCollapsed(snap.collapsed);
    setUndo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  const brandLabel = (bId) => BRANDS.find((b) => b.id === bId).label;
  const counterLabel = (mName, bId, k) => `${mName} · ${brandLabel(bId)}${k ? ` ${k}` : ""}`;

  const setCount = (catId, mName, bId, k, value) => {
    const v = Math.max(0, Math.floor(Number(value) || 0));
    if ((counts[catId][mName][bId][k] || 0) === v) return;
    remember(`${counterLabel(mName, bId, k)}: ${v}`);
    const next = JSON.parse(JSON.stringify(counts));
    next[catId][mName][bId][k] = v;
    persist(next, extras);
  };

  const bump = (catId, mName, bId, k, delta) => {
    const cur = counts[catId][mName][bId][k] || 0;
    if (cur + delta < 0) return;
    setCount(catId, mName, bId, k, cur + delta);
    buzz();
  };

  const bumpExtra = (name, delta) => {
    const cur = extras.find((e) => e.name === name);
    if (!cur || cur.qty + delta < 0) return;
    remember(`${name}: ${cur.qty + delta}`);
    const next = extras.map((e) => (e.name === name ? { ...e, qty: e.qty + delta } : e));
    persist(counts, next);
    buzz();
  };
  const setExtraQty = (name, value) => {
    const v = Math.max(0, Math.floor(Number(value) || 0));
    const cur = extras.find((e) => e.name === name);
    if (!cur || cur.qty === v) return;
    remember(`${name}: ${v}`);
    persist(counts, extras.map((e) => (e.name === name ? { ...e, qty: v } : e)));
  };
  const addExtra = () => {
    const name = newName.trim();
    if (name && !extras.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
      persist(counts, [...extras, { name, qty: 0 }]);
    }
    setNewName(""); setAddingExtra(false);
  };
  const removeExtra = (name) => {
    remember(`"${name}" quitado`);
    persist(counts, extras.filter((e) => e.name !== name));
    setRemoveExtraName(null);
  };

  const toggleReviewed = (catId, mName) => {
    const key = reviewKey(catId, mName);
    const on = !reviewed[key];
    const next = { ...reviewed };
    if (on) next[key] = true; else delete next[key];
    persist(counts, extras, next);
    const order = CATEGORIES.flatMap((c) => c.models.map((m) => reviewKey(c.id, m.name)));
    const nextKey = on ? order.slice(order.indexOf(key) + 1).find((k) => !next[k]) : null;
    setCollapsed((c) => ({ ...c, [key]: on, ...(nextKey ? { [nextKey]: false } : {}) }));
    if (nextKey) {
      // lista guiada: al marcar uno, la pantalla baja al siguiente sin revisar
      setTimeout(() => {
        const el = document.getElementById(`card-${nextKey}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
    buzz();
  };
  const toggleCollapsed = (catId, mName) => {
    const key = reviewKey(catId, mName);
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));
  };

  const makeHistoryEntry = () => ({
    id: String(Date.now()),
    at: new Date().toISOString(),
    nick: nickRef.current || "",
    synced: false,
    counts,
    extras,
    total: grandTotal,
    cats: Object.fromEntries(CATEGORIES.map((c) => [c.id, catTotal(c)])),
    extrasTotal,
  });
  const saveToHistory = () => {
    const entry = makeHistoryEntry();
    remember("Conteo guardado en el historial", entry.id);
    persistHistory([entry, ...historyRef.current].slice(0, HISTORY_MAX));
    syncNow();
    // al guardar se empieza una nueva ronda de revisión
    persist(counts, extras, {});
    setCollapsed({});
    setHistDone(true); setTimeout(() => setHistDone(false), 2500);
  };
  const removeHistoryEntry = (id) => {
    remember("Conteo borrado del historial");
    // si ya estaba en la hoja, se marca para borrarlo allí también
    persistHistory(historyRef.current.flatMap((h) => (h.id !== id ? [h] : h.synced ? [{ ...h, deleted: true, synced: false }] : [])));
    syncNow();
  };

  const doReset = () => {
    const entry = grandTotal + extrasTotal > 0 ? makeHistoryEntry() : null;
    remember("Conteo reiniciado", entry && entry.id);
    if (entry) { persistHistory([entry, ...historyRef.current].slice(0, HISTORY_MAX)); syncNow(); }
    persist(buildCounts(), extras.map((e) => ({ ...e, qty: 0 })), {});
    setCollapsed({});
    setShowReset(false);
  };

  const brandTotal = (catId, model, bId) => {
    const keys = keysFor(model, bId);
    if (!keys) return 0;
    return keys.reduce((s, k) => s + (counts[catId][model.name][bId][k] || 0), 0);
  };
  const modelTotal = (catId, model) => modelTotalIn(counts, catId, model);
  const catTotal = (cat) => catTotalIn(counts, cat);
  const grandTotal = CATEGORIES.reduce((s, c) => s + catTotal(c), 0);
  const extrasTotal = extras.reduce((s, e) => s + e.qty, 0);
  const reviewedCount = Object.keys(reviewed).length;
  /* cada apodo ve solo sus conteos (los antiguos sin apodo se ven siempre) */
  const visibleHistory = history.filter((h) => !h.deleted && (!h.nick || nickKey(h.nick) === nickKey(nick)));
  const lastEntry = visibleHistory[0] || null;

  const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  const shortToday = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "short" });
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
    const L = [`INVENTARIO POS — ${today}`, ...(nick ? [`Contado por: ${nick}`] : []), ""];
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
    const L = [`*INVENTARIO POS* — ${today}`, ...(nick ? [`Contado por: ${nick}`] : []), ""];
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
    ctx.fillText(nick ? `máquinas en total  ·  contado por ${nick}` : "máquinas en total", PADX, 148); ctx.globalAlpha = 1;
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

  const startEdit = (id, value) => { setEditing(id); setEditValue(String(value)); };
  const commitEdit = (apply) => {
    if (editing !== null && editValue.trim() !== "") apply(editValue);
    setEditing(null);
  };

  const goTo = (id) => {
    const el = document.getElementById(`sec-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* número del contador: se toca para escribir la cantidad */
  const renderValue = (id, value, apply, label) =>
    editing === id ? (
      <input
        autoFocus
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        aria-label={`Cantidad de ${label}`}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value.replace(/[^0-9]/g, ""))}
        onFocus={(e) => e.target.select()}
        onBlur={() => commitEdit(apply)}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditing(null); }}
        className="inp text-xl font-bold text-center rounded-lg"
        style={{ width: 52, height: 40, border: `1.5px solid ${INK}`, background: "#fff", color: INK, fontSize: 20, fontVariantNumeric: "tabular-nums" }}
      />
    ) : (
      <button aria-label={`Escribir cantidad de ${label}`} onClick={() => startEdit(id, value)}
        className="linkbtn text-xl font-bold text-center rounded-lg"
        style={{ minWidth: 52, height: 40, fontVariantNumeric: "tabular-nums", color: value ? INK : MUTED, background: "transparent" }}>
        {value}
      </button>
    );

  const renderStepper = ({ id, value, label, onMinus, onPlus, apply, grad, soft, deep }) => (
    <div className="flex items-center gap-1">
      <button aria-label={`Restar ${label}`} onClick={onMinus} disabled={!value}
        className="tapbtn rounded-full flex items-center justify-center"
        style={{ width: 42, height: 42, border: `1.5px solid ${LINE}`, background: "#fff", color: INK, opacity: value ? 1 : 0.35 }}>
        <Minus size={18} />
      </button>
      {renderValue(id, value, apply, label)}
      <button aria-label={`Sumar ${label}`} onClick={onPlus}
        className={`tapbtn rounded-full flex items-center justify-center${value ? " shadow-sm" : ""}`}
        style={{ width: 42, height: 42, background: value ? grad : soft, color: value ? "#fff" : deep }}>
        <Plus size={18} strokeWidth={2.5} />
      </button>
    </div>
  );

  const renderCounter = (catId, mName, bId, k, cat) => {
    const value = counts[catId][mName][bId][k] || 0;
    return renderStepper({
      id: `${catId}|${mName}|${bId}|${k}`,
      value,
      label: counterLabel(mName, bId, k),
      onMinus: () => bump(catId, mName, bId, k, -1),
      onPlus: () => bump(catId, mName, bId, k, 1),
      apply: (v) => setCount(catId, mName, bId, k, v),
      grad: cat.grad,
      soft: cat.soft,
      deep: cat.accentDeep,
    });
  };

  /* texto con negrita en lo que tiene unidades: "Krups: Blanca 3 · Negra 0" */
  const valIn = (c, catId, mName, bId, k) => Number(c?.[catId]?.[mName]?.[bId]?.[k]) || 0;
  const brandTotalIn = (c, catId, model, bId) => (keysFor(model, bId) || []).reduce((s, k) => s + valIn(c, catId, model.name, bId, k), 0);
  const renderBrandParts = (c, catId, model, bId, skipZeros) => {
    const keys = keysFor(model, bId);
    const label = brandLabel(bId);
    const shown = keys.filter((k) => !skipZeros || valIn(c, catId, model.name, bId, k));
    return (
      <>
        <span>{label}{keys[0] === "" ? " " : ": "}</span>
        {shown.map((k, i) => {
          const v = valIn(c, catId, model.name, bId, k);
          return (
            <span key={k}>
              {i > 0 && " · "}
              {k && `${k} `}
              {v ? <b style={{ color: INK }}>{v}</b> : <span>{v}</span>}
            </span>
          );
        })}
      </>
    );
  };

  const Diff = ({ now, before }) => {
    const d = now - before;
    if (!d) return null;
    return (
      <span className="text-xs font-semibold ml-1.5" style={{ color: d > 0 ? "#138A72" : "#C42E63", fontVariantNumeric: "tabular-nums" }}>
        {d > 0 ? `+${d}` : `−${-d}`}
      </span>
    );
  };

  /* fila "comparado con…" + botón Ocultar ceros (resumen e historial) */
  const renderCompareBar = (base) => (
    <div className="px-5 pt-3 flex items-center justify-between gap-3">
      <span className="text-xs" style={{ color: MUTED }}>
        {base ? <>Diferencias vs. conteo del <b>{fmtDateTime(base.at)}</b></> : "Sin conteo anterior para comparar"}
      </span>
      <button onClick={() => setHideZeros((v) => !v)} aria-pressed={hideZeros}
        className="linkbtn rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 flex-shrink-0"
        style={{ background: hideZeros ? INK : "#fff", color: hideZeros ? "#fff" : INK, border: `1px solid ${hideZeros ? INK : LINE}` }}>
        <EyeOff size={14} /> Ocultar ceros
      </button>
    </div>
  );

  /* cuerpo del resumen para un conteo cualquiera (actual o del historial) */
  const renderSummaryBody = (c, ex, base) => {
    const total = CATEGORIES.reduce((s, cat) => s + catTotalIn(c, cat), 0);
    const exTotal = ex.reduce((s, e) => s + (e.qty || 0), 0);
    const baseEx = (name) => (base?.extras || []).find((e) => e.name === name)?.qty || 0;
    return (
      <div className="px-5 py-4 space-y-5">
        {CATEGORIES.map((cat) => {
          const models = cat.models.filter((m) => !hideZeros || modelTotalIn(c, cat.id, m));
          return (
            <div key={cat.id}>
              <div className="text-xs font-bold uppercase mb-2" style={{ letterSpacing: "0.1em", color: cat.accent }}>
                {cat.name} · {catTotalIn(c, cat)} máquinas
                {base && <Diff now={catTotalIn(c, cat)} before={catTotalIn(base.counts, cat)} />}
              </div>
              {models.length === 0 && <div className="text-xs" style={{ color: MUTED }}>Nada contado en {cat.name}.</div>}
              <div className="space-y-2">
                {models.map((model) => {
                  const t = modelTotalIn(c, cat.id, model);
                  const diff = base ? <Diff now={t} before={modelTotalIn(base.counts, cat.id, model)} /> : null;
                  const brands = modelBrands(model).filter((b) => !hideZeros || brandTotalIn(c, cat.id, model, b.id));
                  if (allSingle(model)) {
                    return (
                      <div key={model.name} className="flex items-center justify-between text-sm py-1" style={{ borderBottom: `1px solid ${LINE}`, opacity: t ? 1 : 0.5 }}>
                        <span className="font-medium">{model.name}</span>
                        <span style={{ color: MUTED, fontVariantNumeric: "tabular-nums" }}>
                          {brands.map((b, i) => (
                            <span key={b.id}>{i > 0 && "  ·  "}{renderBrandParts(c, cat.id, model, b.id, false)}</span>
                          ))}
                          {" "}<b style={{ color: t ? cat.accent : MUTED }}>{t}</b>{diff}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={model.name} style={{ borderBottom: `1px solid ${LINE}`, opacity: t ? 1 : 0.5 }} className="pb-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{model.name}</span>
                        <span><b style={{ color: t ? cat.accent : MUTED, fontVariantNumeric: "tabular-nums" }}>{t}</b>{diff}</span>
                      </div>
                      {brands.map((b) => (
                        <div key={b.id} className="text-xs mt-0.5" style={{ color: MUTED, fontVariantNumeric: "tabular-nums" }}>{renderBrandParts(c, cat.id, model, b.id, hideZeros)}</div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="flex items-center justify-between pt-1 text-sm font-bold">
          <span>Total máquinas</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{total}{base && <Diff now={total} before={base.total} />}</span>
        </div>

        {ex.length > 0 && (
          <div>
            <div className="text-xs font-bold uppercase mb-2" style={{ letterSpacing: "0.1em", color: EXTRA.accent }}>Otros productos · {exTotal}</div>
            {ex.filter((e) => !hideZeros || e.qty).map((e) => (
              <div key={e.name} className="flex items-center justify-between text-sm py-2" style={{ borderBottom: `1px solid ${LINE}`, opacity: e.qty ? 1 : 0.5 }}>
                <span className="font-medium">{e.name}</span>
                <span>
                  <span className="font-bold" style={{ color: e.qty ? EXTRA.accent : MUTED, fontVariantNumeric: "tabular-nums" }}>{e.qty}</span>
                  {base && <Diff now={e.qty} before={baseEx(e.name)} />}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const sections = [
    ...CATEGORIES.map((c) => ({ id: c.id, name: c.name, total: catTotal(c), accent: c.accent, soft: c.soft, deep: c.accentDeep })),
    { id: "otros", name: "Otros", total: extrasTotal, accent: EXTRA.accent, soft: EXTRA.soft, deep: EXTRA.accentDeep },
  ];

  const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";

  return (
    <div style={{ background: PAPER, color: INK }} className="app-shell flex flex-col overflow-hidden">
      <style>{`
        @keyframes pop { 0%{transform:scale(1)} 40%{transform:scale(.84)} 100%{transform:scale(1)} }
        @keyframes toastin { from{transform:translateY(12px);opacity:0} to{transform:none;opacity:1} }
        .tapbtn:active:not(:disabled) { animation: pop .18s ease; }
        .tapbtn:focus-visible, .linkbtn:focus-visible, .inp:focus-visible { outline: 2px solid ${INK}; outline-offset: 2px; }
        .inp { outline: none; }
        .toast { animation: toastin .2s ease; }
        .chips::-webkit-scrollbar { display: none; }
        .app-shell { height: 100vh; height: 100dvh; }
        button { -webkit-tap-highlight-color: transparent; }
        @media (prefers-reduced-motion: reduce) { .tapbtn:active { animation: none; } .toast { animation: none; } }
      `}</style>

      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
      <div className="max-w-md mx-auto px-4" style={{ paddingBottom: 72 }}>
        {/* Cabecera */}
        <div ref={headerRef} className="pt-3 pb-1">
          <div className="rounded-2xl px-4 pt-3 pb-3 shadow-md" style={{ background: HEADER_GRAD, color: "#fff" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coffee size={18} />
                <span className="text-xs font-bold uppercase" style={{ letterSpacing: "0.16em" }}>Inventario POS</span>
              </div>
              <button onClick={() => { setNickDraft(nick); setShowNick(true); }} aria-label={nick ? `Apodo: ${nick}. Cambiar` : "Elegir apodo"}
                className="linkbtn rounded-full pl-2 pr-2.5 py-1 text-xs font-bold flex items-center gap-1 min-w-0"
                style={{ background: "rgba(255,255,255,0.2)", color: "#fff", maxWidth: "55%" }}>
                <User size={13} className="flex-shrink-0" /> <span className="truncate">{nick || "Elegir apodo"}</span>
              </button>
            </div>
            <div className="flex items-end justify-between mt-2 gap-3">
              <div>
                <div className="leading-none font-bold" style={{ fontSize: "2rem", fontVariantNumeric: "tabular-nums" }}>
                  {reviewedCount}<span style={{ fontSize: "1.1rem", opacity: 0.75 }}>/{MODEL_COUNT}</span>
                </div>
                <div className="text-xs mt-1" style={{ opacity: 0.9 }}>modelos revisados</div>
              </div>
              <div className="text-right">
                <div className="leading-none font-bold" style={{ fontSize: "1.25rem", fontVariantNumeric: "tabular-nums" }}>{grandTotal}</div>
                <div className="text-xs mt-1" style={{ opacity: 0.9 }}>máquinas</div>
              </div>
            </div>
            <div className="rounded-full overflow-hidden mt-2" style={{ height: 6, background: "rgba(255,255,255,0.28)" }}>
              <div className="rounded-full" style={{ height: "100%", width: `${(reviewedCount / MODEL_COUNT) * 100}%`, background: "#fff", transition: "width .25s ease" }} />
            </div>
            <div className="text-[11px] mt-1.5" style={{ opacity: 0.8 }}>{shortToday}{savedTime ? ` · guardado ${savedTime}` : ""}</div>
          </div>
        </div>

        {/* Accesos rápidos (fijos arriba) */}
        <div className="sticky top-0 z-10 -mx-4 px-4 py-2" style={{ background: PAPER, borderBottom: scrolled ? `1px solid ${LINE}` : "1px solid transparent" }}>
          <div className="flex items-center gap-2">
            <div className="chips flex gap-2 overflow-x-auto flex-1" style={{ scrollbarWidth: "none" }}>
              {sections.map((sec) => {
                const on = activeSec === sec.id;
                return (
                  <button key={sec.id} onClick={() => goTo(sec.id)}
                    className="linkbtn rounded-full pl-3 pr-1.5 py-1.5 text-xs font-bold flex items-center gap-1.5 flex-shrink-0"
                    style={{ background: on ? sec.accent : SURFACE, color: on ? "#fff" : sec.deep, border: `1px solid ${on ? sec.accent : LINE}` }}>
                    {sec.name}
                    <span className="rounded-full px-1.5" style={{ background: on ? "rgba(255,255,255,0.25)" : sec.soft, fontVariantNumeric: "tabular-nums", minWidth: 20, textAlign: "center" }}>{sec.total}</span>
                  </button>
                );
              })}
            </div>
            <div className="text-right flex-shrink-0" style={{ opacity: scrolled ? 1 : 0, transition: "opacity .2s ease" }} aria-hidden={!scrolled}>
              <div className="font-bold leading-none" style={{ fontSize: 18, fontVariantNumeric: "tabular-nums" }}>{reviewedCount}/{MODEL_COUNT} ✓</div>
              <div style={{ fontSize: 10, color: MUTED, fontVariantNumeric: "tabular-nums" }}>{grandTotal} máquinas</div>
            </div>
          </div>
        </div>

        {/* Categorías */}
        {CATEGORIES.map((cat) => (
          <div key={cat.id} id={`sec-${cat.id}`} className="mb-7 pt-3" style={{ scrollMarginTop: 52 }}>
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase" style={{ letterSpacing: "0.12em", color: cat.accent }}>{cat.name}</span>
                <span className="rounded-full" style={{ width: 26, height: 4, background: cat.grad }} />
              </div>
            </div>

            <div className="space-y-3">
              {cat.models.map((model) => {
                const key = reviewKey(cat.id, model.name);
                const isReviewed = !!reviewed[key];
                const isCollapsed = !!collapsed[key];
                const t = modelTotal(cat.id, model);
                return (
                  <div key={model.name} id={`card-${key}`} style={{ background: SURFACE, border: `1px solid ${isReviewed ? cat.accent : LINE}`, scrollMarginTop: 60 }} className="rounded-2xl px-4 pt-2 pb-2 shadow-sm">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleCollapsed(cat.id, model.name)} aria-expanded={!isCollapsed}
                        className="linkbtn flex-1 flex items-center gap-1.5 py-1.5 text-left min-w-0" style={{ background: "transparent", color: INK }}>
                        <ChevronDown size={18} style={{ color: MUTED, transform: isCollapsed ? "rotate(-90deg)" : "none", transition: "transform .15s ease", flexShrink: 0 }} />
                        <span className="font-semibold text-[15px] truncate">{model.name}</span>
                      </button>
                      <span className="text-sm font-bold px-2 py-0.5 rounded-full" style={{ background: t ? cat.soft : "transparent", color: t ? cat.accentDeep : MUTED, fontVariantNumeric: "tabular-nums", minWidth: 26, textAlign: "center" }}>
                        {t}
                      </span>
                      <button onClick={() => toggleReviewed(cat.id, model.name)}
                        role="checkbox" aria-checked={isReviewed} aria-label={`${model.name} revisado`}
                        className="tapbtn flex items-center gap-1.5 px-1 py-1 text-xs font-bold flex-shrink-0"
                        style={{ background: "transparent", color: isReviewed ? cat.accentDeep : MUTED }}>
                        <span className="flex items-center justify-center rounded-md"
                          style={{ width: 22, height: 22, border: `2px solid ${isReviewed ? cat.accent : "#B9B0A4"}`, background: isReviewed ? cat.accent : "#fff" }}>
                          {isReviewed && <Check size={15} color="#fff" strokeWidth={3} />}
                        </span>
                        Revisado
                      </button>
                    </div>

                    {isCollapsed ? (
                      <div className="text-xs pb-1.5 pl-6" style={{ color: MUTED }}>
                        {modelBrands(model).map((b, i) => (
                          <span key={b.id}>{i > 0 && "  ·  "}{b.label} <b style={{ color: brandTotal(cat.id, model, b.id) ? INK : MUTED }}>{brandTotal(cat.id, model, b.id)}</b></span>
                        ))}
                      </div>
                    ) : (
                      <div className="pb-1">
                        {BRANDS.map((b) => {
                          const keys = keysFor(model, b.id);
                          if (!keys) return null;
                          const single = keys.length === 1 && keys[0] === "";
                          if (single) {
                            return (
                              <div key={b.id} className="flex items-center justify-between py-1 -mx-2 px-2 rounded-xl"
                                style={{ background: counts[cat.id][model.name][b.id][""] ? `${cat.soft}99` : "transparent" }}>
                                <span className="text-sm" style={counts[cat.id][model.name][b.id][""] ? { color: INK, fontWeight: 600 } : { color: MUTED }}>{b.label}</span>
                                {renderCounter(cat.id, model.name, b.id, "", cat)}
                              </div>
                            );
                          }
                          return (
                            <div key={b.id} className="mt-2">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-bold uppercase" style={{ letterSpacing: "0.06em", color: MUTED }}>{b.label}</span>
                                <span className="text-xs" style={{ color: MUTED, fontVariantNumeric: "tabular-nums" }}>{brandTotal(cat.id, model, b.id)}</span>
                              </div>
                              {keys.map((k) => {
                                const has = !!counts[cat.id][model.name][b.id][k];
                                return (
                                  <div key={k} className="flex items-center justify-between py-1 -mx-2 px-2 rounded-xl" style={{ background: has ? `${cat.soft}99` : "transparent" }}>
                                    <span className="text-sm flex items-center gap-2" style={{ fontWeight: has ? 600 : 400 }}><Swatch name={k} />{k}</span>
                                    {renderCounter(cat.id, model.name, b.id, k, cat)}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                        {!isReviewed && (
                          <button onClick={() => toggleReviewed(cat.id, model.name)}
                            className="linkbtn w-full mt-2 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
                            style={{ background: cat.soft, color: cat.accentDeep }}>
                            <Check size={17} className="flex-shrink-0" /> Listo, marcar como revisado
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Otros productos */}
        <div id="sec-otros" className="mb-2 pt-3" style={{ scrollMarginTop: 52 }}>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Package size={16} style={{ color: EXTRA.accent }} />
              <span className="text-sm font-bold uppercase" style={{ letterSpacing: "0.12em", color: EXTRA.accent }}>Otros productos</span>
              <span className="rounded-full" style={{ width: 26, height: 4, background: EXTRA.grad }} />
            </div>
          </div>

          {extras.length === 0 && !addingExtra && (
            <p className="text-xs mb-3 px-1" style={{ color: MUTED }}>Cápsulas, sleeves, tazas, Welcome Packs… lo que necesites contar aparte.</p>
          )}

          <div className="space-y-3">
            {extras.map((e) => (
              <div key={e.name} style={{ background: e.qty ? EXTRA.soft : SURFACE, border: `1px solid ${e.qty ? EXTRA.accent : LINE}` }} className="rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-[15px] truncate">{e.name}</span>
                  <button aria-label={`Quitar ${e.name}`} onClick={() => setRemoveExtraName(e.name)} className="linkbtn p-1 rounded-full flex-shrink-0" style={{ color: MUTED }}><Trash2 size={15} /></button>
                </div>
                <div className="flex-shrink-0">
                  {renderStepper({
                    id: `extra|${e.name}`,
                    value: e.qty,
                    label: e.name,
                    onMinus: () => bumpExtra(e.name, -1),
                    onPlus: () => bumpExtra(e.name, 1),
                    apply: (v) => setExtraQty(e.name, v),
                    grad: EXTRA.grad,
                    soft: EXTRA.soft,
                    deep: EXTRA.accentDeep,
                  })}
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
      </div>

      {/* Aviso de deshacer */}
      {undo && (
        <div className="fixed left-0 right-0 px-4 pointer-events-none"
          style={showSummary || showHistory
            ? { zIndex: 60, top: "calc(12px + env(safe-area-inset-top, 0px))" }
            : { zIndex: 60, bottom: `calc(78px + ${SAFE_BOTTOM})` }}>
          <div role="status" className="toast pointer-events-auto max-w-md mx-auto rounded-xl pl-4 pr-2 py-2 flex items-center gap-3 shadow-lg" style={{ background: INK, color: "#fff" }}>
            <span className="text-sm flex-1 truncate">{undo.label}</span>
            <button onClick={doUndo} className="linkbtn rounded-lg px-3 py-2 text-sm font-bold flex items-center gap-1.5 flex-shrink-0" style={{ color: "#F2A23C", background: "rgba(255,255,255,0.08)" }}>
              <Undo2 size={16} /> Deshacer
            </button>
          </div>
        </div>
      )}

      {/* Barra inferior */}
      <div className="flex-shrink-0 z-20" style={{ background: PAPER, borderTop: `1px solid ${LINE}`, paddingBottom: SAFE_BOTTOM }}>
        <div className="max-w-md mx-auto px-4 py-3 flex gap-3">
          <button onClick={() => { setUndo(null); setShowSummary(true); }} className="linkbtn flex-1 rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 shadow-sm" style={{ background: INK, color: "#fff" }}>
            <ClipboardList size={17} /> Resumen para GESIMO
          </button>
          <button onClick={() => { setUndo(null); setShowHistory(true); syncNow(); }} aria-label="Historial de conteos" className="linkbtn rounded-xl px-2 flex flex-col items-center justify-center gap-0.5" style={{ background: "#fff", border: `1px solid ${LINE}`, color: INK, minWidth: 66 }}>
            <History size={18} /><span className="text-[10px] font-semibold">Historial</span>
          </button>
          <button onClick={() => setShowReset(true)} aria-label="Reiniciar conteo" className="linkbtn rounded-xl px-2 flex flex-col items-center justify-center gap-0.5" style={{ background: "transparent", border: `1px dashed ${LINE}`, color: "#A8445F", minWidth: 66 }}>
            <RotateCcw size={18} /><span className="text-[10px] font-semibold">Reiniciar</span>
          </button>
        </div>
      </div>

      {/* Resumen */}
      {showSummary && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center" style={{ background: "rgba(36,26,22,0.5)" }} onClick={() => setShowSummary(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: PAPER }} className="w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ background: HEADER_GRAD, color: "#fff" }}>
              <div>
                <div className="font-bold">Resumen para GESIMO</div>
                <div className="text-xs" style={{ opacity: 0.9 }}>{today} · {grandTotal} máquinas</div>
              </div>
              <button onClick={() => setShowSummary(false)} aria-label="Cerrar" className="rounded-full p-1" style={{ color: "#fff" }}><X size={22} /></button>
            </div>

            <div className="overflow-y-auto flex-1">
              {renderCompareBar(lastEntry)}
              {renderSummaryBody(counts, extras, lastEntry)}
            </div>

            {/* Acciones siempre a mano */}
            <div className="flex-shrink-0 px-4 pt-3" style={{ borderTop: `1px solid ${LINE}`, background: PAPER, paddingBottom: `calc(12px + ${SAFE_BOTTOM})` }}>
              <div className="grid grid-cols-4 gap-2">
                <button onClick={saveToHistory} className="linkbtn rounded-xl py-2 text-xs font-semibold flex flex-col items-center justify-center gap-1" style={{ background: INK, color: "#fff" }}>
                  {histDone ? <Check size={20} /> : <History size={20} />}
                  {histDone ? "Guardado" : "Guardar"}
                </button>
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="linkbtn rounded-xl py-2 text-xs font-semibold flex flex-col items-center justify-center gap-1" style={{ background: "#25D366", color: "#fff", textDecoration: "none" }}>
                  <Send size={20} /> WhatsApp
                </a>
                <button onClick={copySummary} className="linkbtn rounded-xl py-2 text-xs font-semibold flex flex-col items-center justify-center gap-1" style={{ background: "#fff", border: `1px solid ${LINE}`, color: INK }}>
                  {copied ? <Check size={20} /> : <ClipboardList size={20} />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
                <button onClick={shareImage} className="linkbtn rounded-xl py-2 text-xs font-semibold flex flex-col items-center justify-center gap-1" style={{ background: HEADER_GRAD, color: "#fff" }}>
                  {imgDone ? <Check size={20} /> : <ImageIcon size={20} />}
                  {imgDone ? "Lista" : "Imagen"}
                </button>
              </div>
              <p className="text-[11px] mt-2 text-center" style={{ color: MUTED }}>Guardar lo añade al historial y reinicia los revisados · WhatsApp, Copiar e Imagen envían el resumen completo.</p>
            </div>
          </div>
        </div>
      )}

      {/* Historial */}
      {showHistory && (() => {
        const idx = visibleHistory.findIndex((h) => h.id === openEntry);
        const entry = idx >= 0 ? visibleHistory[idx] : null;
        const prev = entry ? visibleHistory[idx + 1] || null : null;
        return (
          <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center" style={{ background: "rgba(36,26,22,0.5)" }} onClick={() => { setShowHistory(false); setOpenEntry(null); }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: PAPER }} className="w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto">
              <div className="sticky top-0 z-10 flex items-center gap-2 px-5 py-4" style={{ background: entry ? HEADER_GRAD : INK, color: "#fff" }}>
                {entry && (
                  <button onClick={() => setOpenEntry(null)} aria-label="Volver al historial" className="rounded-full p-1 -ml-2" style={{ color: "#fff" }}>
                    <ChevronDown size={22} style={{ transform: "rotate(90deg)" }} />
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  {entry ? (
                    <>
                      <div className="font-bold">Conteo del {fmtDateTime(entry.at)}</div>
                      <div className="text-xs" style={{ opacity: 0.9 }}>{entry.total} máquinas{entry.extrasTotal ? ` · ${entry.extrasTotal} otros` : ""}</div>
                    </>
                  ) : (
                    <>
                      <div className="font-bold">Historial de {nick || "conteos"}</div>
                      <div className="text-xs flex items-center gap-1" style={{ opacity: 0.85 }}>
                        {syncState === "off" && <><CloudOff size={13} /> Solo en este teléfono</>}
                        {syncState === "idle" && <><Cloud size={13} /> Google Sheets</>}
                        {syncState === "syncing" && <><Cloud size={13} /> Sincronizando…</>}
                        {syncState === "ok" && <><Cloud size={13} /> Guardado en Google Sheets</>}
                        {syncState === "error" && <><CloudOff size={13} /> Sin conexión · se enviará cuando haya internet</>}
                      </div>
                    </>
                  )}
                </div>
                <button onClick={() => { setShowHistory(false); setOpenEntry(null); }} aria-label="Cerrar" className="rounded-full p-1" style={{ color: "#fff" }}><X size={22} /></button>
              </div>

              {entry ? (
                <div style={{ paddingBottom: `calc(16px + ${SAFE_BOTTOM})` }}>
                  {renderCompareBar(prev)}
                  {renderSummaryBody(entry.counts, entry.extras || [], prev)}
                  <div className="px-5">
                    <button onClick={() => { removeHistoryEntry(entry.id); setOpenEntry(null); }} className="linkbtn w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2" style={{ background: "#fff", border: `1px solid ${LINE}`, color: "#C42E63" }}>
                      <Trash2 size={16} /> Borrar este conteo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-5 py-4 space-y-3" style={{ paddingBottom: `calc(24px + ${SAFE_BOTTOM})` }}>
                  {visibleHistory.length === 0 && (
                    <p className="text-sm text-center py-6" style={{ color: MUTED }}>Todavía no hay conteos guardados. Usa "Guardar" en el resumen, o al reiniciar se guarda solo.</p>
                  )}
                  {visibleHistory.map((h, i) => {
                    const before = visibleHistory[i + 1];
                    return (
                      <button key={h.id} onClick={() => setOpenEntry(h.id)}
                        className="linkbtn w-full text-left rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3"
                        style={{ background: SURFACE, border: `1px solid ${LINE}`, color: INK }}>
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold text-sm">
                            {fmtDateTime(h.at)}
                            {SHEETS_URL && !h.synced && <span className="ml-1.5 text-[11px] font-semibold" style={{ color: "#C9822A" }}>· pendiente de enviar</span>}
                          </span>
                          <span className="block text-xs" style={{ color: MUTED }}>
                            {CATEGORIES.map((c) => `${c.name} ${h.cats?.[c.id] ?? catTotalIn(h.counts, c)}`).join(" · ")}{h.extrasTotal ? ` · Otros ${h.extrasTotal}` : ""}
                          </span>
                        </span>
                        <span className="font-bold text-lg" style={{ fontVariantNumeric: "tabular-nums" }}>{h.total}</span>
                        {before && <Diff now={h.total} before={before.total} />}
                        <ChevronDown size={18} style={{ color: MUTED, transform: "rotate(-90deg)", flexShrink: 0 }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Quitar producto extra */}
      {removeExtraName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(36,26,22,0.5)" }} onClick={() => setRemoveExtraName(null)}>
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

      {/* Apodo */}
      {showNick && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(36,26,22,0.5)" }} onClick={() => { if (nick) setShowNick(false); }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: PAPER }} className="w-full max-w-xs rounded-3xl p-6">
            <div className="flex items-center gap-2 font-bold mb-1"><User size={18} /> ¿Quién cuenta?</div>
            <p className="text-sm mb-4" style={{ color: MUTED }}>
              Escribe tu apodo. Tus conteos guardados se separan por apodo: cada uno ve solo los suyos.
            </p>
            <input
              autoFocus
              value={nickDraft}
              onChange={(e) => setNickDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applyNick(); }}
              placeholder="Ej.: Carlos, Tienda Centro…"
              maxLength={30}
              className="inp w-full rounded-xl px-3 py-3 mb-2"
              style={{ border: `1px solid ${LINE}`, background: "#fff", color: INK, fontSize: "16px" }}
            />
            <p className="text-xs mb-4" style={{ color: MUTED }}>Quien use el mismo apodo verá los mismos conteos, así que elige uno propio.</p>
            <div className="flex gap-3">
              {nick && <button onClick={() => setShowNick(false)} className="linkbtn flex-1 rounded-xl py-3 font-semibold text-sm" style={{ background: "#fff", border: `1px solid ${LINE}` }}>Cancelar</button>}
              <button onClick={applyNick} disabled={nickDraft.trim().length < 2}
                className="linkbtn flex-1 rounded-xl py-3 font-semibold text-sm" style={{ background: HEADER_GRAD, color: "#fff", opacity: nickDraft.trim().length < 2 ? 0.5 : 1 }}>
                {nick ? "Guardar" : "Empezar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reiniciar */}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(36,26,22,0.5)" }} onClick={() => setShowReset(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: PAPER }} className="w-full max-w-xs rounded-3xl p-6 text-center">
            <div className="font-bold mb-1">¿Reiniciar el conteo?</div>
            <p className="text-sm mb-5" style={{ color: MUTED }}>El conteo actual se guarda en el historial y todo vuelve a 0 (también los modelos revisados).</p>
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
