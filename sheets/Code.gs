/**
 * Stockito — backend en Google Sheets (Apps Script).
 *
 * Guarda los conteos del historial separados por apodo. Cada apodo solo
 * recibe sus propios conteos. Pestañas que crea solo:
 *   - "Conteos": una fila por color/producto con cantidad > 0 (para leer y filtrar)
 *   - "Datos":   una fila por conteo con el JSON completo (lo usa la app; no editar)
 *
 * Despliegue: Implementar → Nueva implementación → Aplicación web,
 * "Ejecutar como: yo", "Quién tiene acceso: cualquier persona".
 * Pasos completos en sheets/LEEME.md.
 */

const DATA_SHEET = 'Datos';
const ROWS_SHEET = 'Conteos';
const DATA_HEADERS = ['ID', 'Fecha', 'Apodo', 'Clave', 'JSON'];
const ROWS_HEADERS = ['ID', 'Fecha', 'Apodo', 'Categoría', 'Modelo', 'Marca', 'Color', 'Cantidad'];
const LIST_MAX = 50;

function doGet(e) {
  return handle_((e && e.parameter) || {});
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) {}
  return handle_(body);
}

function handle_(req) {
  try {
    const key = nickKey_(req.nick);
    if (!key) return json_({ ok: false, error: 'Falta el apodo' });
    if (req.action === 'list') return json_({ ok: true, entries: list_(key) });

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      if (req.action === 'save') {
        // se respeta cómo se escribió el apodo al guardar ("Carlos" aunque ahora escriba "carlos")
        const e = req.entry || {};
        const shown = nickKey_(e.nick) === key ? String(e.nick).trim() : String(req.nick).trim();
        save_(key, shown, e);
        return json_({ ok: true });
      }
      if (req.action === 'delete') { remove_(key, String(req.id || '')); return json_({ ok: true }); }
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: false, error: 'Acción desconocida' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function list_(key) {
  const sh = sheet_(DATA_SHEET, DATA_HEADERS);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const rows = sh.getRange(2, 1, last - 1, DATA_HEADERS.length).getValues();
  const out = [];
  for (const r of rows) {
    if (String(r[3]) !== key) continue;
    try { out.push(JSON.parse(r[4])); } catch (err) {}
  }
  out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return out.slice(0, LIST_MAX);
}

function save_(key, nick, entry) {
  if (!entry || !entry.id || !entry.at) throw new Error('Conteo incompleto');
  const id = String(entry.id);
  remove_(key, id); // guardar es idempotente: reemplaza si ya existía
  const when = new Date(entry.at);
  const lines = Array.isArray(entry.lines) ? entry.lines : [];
  const stored = Object.assign({}, entry, { id: id, nick: nick });
  delete stored.lines;

  sheet_(DATA_SHEET, DATA_HEADERS).appendRow([id, when, safe_(nick), key, JSON.stringify(stored)]);

  const rows = lines.length
    ? lines.map((l) => [id, when, safe_(nick), safe_(l.cat), safe_(l.model), safe_(l.brand), safe_(l.color), Number(l.qty) || 0])
    : [[id, when, safe_(nick), '(vacío)', '', '', '', 0]];
  const sh = sheet_(ROWS_SHEET, ROWS_HEADERS);
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, ROWS_HEADERS.length).setValues(rows);
}

function remove_(key, id) {
  if (!id) return;
  const data = sheet_(DATA_SHEET, DATA_HEADERS);
  deleteRows_(data, (r) => String(r[0]) === id && String(r[3]) === key);
  const rows = sheet_(ROWS_SHEET, ROWS_HEADERS);
  deleteRows_(rows, (r) => String(r[0]) === id && nickKey_(r[2]) === key);
}

function deleteRows_(sh, match) {
  const last = sh.getLastRow();
  if (last < 2) return;
  const values = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (match(values[i])) sh.deleteRow(i + 2);
  }
}

function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

/* apodo sin mayúsculas/espacios sobrantes: "Carlos " y "carlos" son el mismo */
function nickKey_(nick) {
  return String(nick || '').trim().toLowerCase().replace(/^'/, '');
}

/* evita que un texto que empieza por = + - @ se ejecute como fórmula */
function safe_(v) {
  const s = String(v == null ? '' : v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
