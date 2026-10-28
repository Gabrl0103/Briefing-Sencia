const express = require("express");
const crypto = require("crypto");
const path = require("path");
const { Pool } = require("pg");
const S = require("./public/questions.js");

const all = S.flatMap(s => s.q);
const ESTADOS = ["Nuevo", "Contactado", "Propuesta enviada", "Cerrado", "Descartado"];
const app = express();
app.set("trust proxy", 1); // Railway va detrás de un proxy
app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS respuestas (
      id SERIAL PRIMARY KEY,
      creado TIMESTAMPTZ NOT NULL DEFAULT now(),
      datos JSONB NOT NULL
    )`);
  await pool.query("ALTER TABLE respuestas ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'Nuevo'");
}

// ---------- utilidades ----------
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fecha = d => new Date(d).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" });

// Admin: clave larga + máximo 10 intentos fallidos cada 15 minutos por IP
const fallos = new Map();
function auth(req, res, next) {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass || pass.length < 12) return res.status(500).send("Configura ADMIN_PASSWORD con al menos 12 caracteres.");
  const ahora = Date.now(), ventana = 15 * 60 * 1000;
  const lista = (fallos.get(req.ip) || []).filter(t => ahora - t < ventana);
  if (lista.length >= 10) return res.status(429).send("Demasiados intentos fallidos. Espera 15 minutos.");
  const h = req.headers.authorization || "";
  const given = Buffer.from(h.split(" ")[1] || "", "base64").toString().split(":").slice(1).join(":");
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(pass).digest();
  if (crypto.timingSafeEqual(a, b)) return next();
  if (h) { lista.push(ahora); fallos.set(req.ip, lista); }
  res.set("WWW-Authenticate", 'Basic realm="Sencia admin"').status(401).send("Acceso restringido");
}

// Los POST del admin solo se aceptan desde esta misma página (evita que otro sitio los dispare)
function mismoOrigen(req, res, next) {
  const o = req.headers.origin;
  if (o && new URL(o).host !== req.headers.host) return res.status(403).send("Origen no permitido");
  next();
}

const css = `
:root{--bg:#EFF0EC;--surface:#FAFAF7;--ink:#20251F;--muted:#626A60;--line:#D3D6CE;--accent:#3E5A4C;--accent-ink:#F4F6F1;
--display:"Italiana",Georgia,serif;--body:"Figtree","Segoe UI",system-ui,sans-serif}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--body);line-height:1.5;padding:0 16px 64px}
.wrap{max-width:760px;margin:0 auto}
header{padding:32px 0 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap}
.brand{font-family:var(--display);font-size:22px;letter-spacing:.3em;text-transform:uppercase;text-decoration:none;color:var(--ink)}
h1{font-family:var(--display);font-weight:400;font-size:34px;margin:24px 0 6px}
h2{font-family:var(--display);font-weight:400;font-size:24px;margin:0 0 12px}
.muted{color:var(--muted);font-size:14px}
table{width:100%;border-collapse:collapse;background:var(--surface);border:1px solid var(--line);margin-top:16px;font-size:14px}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
a{color:var(--accent)}
.btn{display:inline-block;padding:10px 16px;border:1px solid var(--accent);border-radius:4px;background:var(--accent);color:var(--accent-ink);text-decoration:none;font:inherit;font-weight:600;font-size:14px;cursor:pointer}
.btn.s{background:transparent;color:var(--accent)}
.campo{padding:9px 12px;border:1px solid var(--line);border-radius:4px;background:var(--surface);color:var(--ink);font:inherit;font-size:14px}
.tag{display:inline-block;padding:2px 10px;border-radius:999px;border:1px solid var(--line);background:var(--surface);font-size:12px;white-space:nowrap}
.tag.n{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
section{padding:24px 0 8px;border-bottom:1px solid var(--line)}
.num{font-size:12px;letter-spacing:.14em;color:var(--accent);font-weight:600;margin-right:10px}
dl{margin:0}
dt{font-size:13px;color:var(--muted);margin-top:14px}
dd{margin:2px 0 0;white-space:pre-wrap;font-size:15px}
dd.vacio{color:var(--muted)}
.acciones{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
@media print{body{background:#fff;padding:0}.acciones,.noprint{display:none}}
`;

function page(titulo, cuerpo) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Italiana&family=Figtree:wght@400;500;600&display=swap">
<style>${css}</style></head><body><div class="wrap">
<header><a class="brand" href="/admin">Sencia</a><span class="muted noprint">Panel de briefings</span></header>
${cuerpo}</div></body></html>`;
}

const tag = e => `<span class="tag${e === "Nuevo" ? " n" : ""}">${esc(e)}</span>`;

// ---------- API pública ----------
app.get("/api/config", (req, res) => {
  res.json({ whatsapp: (process.env.WHATSAPP_NUMBER || "").replace(/\D/g, "") });
});

// Límite de envíos por IP (en memoria): máximo 10 por hora
const envios = new Map();
function limite(req, res, next) {
  const ahora = Date.now(), ventana = 60 * 60 * 1000, max = 10;
  const lista = (envios.get(req.ip) || []).filter(t => ahora - t < ventana);
  if (lista.length >= max) return res.status(429).json({ error: "Demasiados envíos desde tu conexión, intenta más tarde" });
  lista.push(ahora);
  envios.set(req.ip, lista);
  next();
}
setInterval(() => {
  const ahora = Date.now();
  for (const [ip, l] of envios) if (!l.some(t => ahora - t < 60 * 60 * 1000)) envios.delete(ip);
  for (const [ip, l] of fallos) if (!l.some(t => ahora - t < 15 * 60 * 1000)) fallos.delete(ip);
}, 10 * 60 * 1000).unref();

app.post("/api/respuestas", limite, async (req, res) => {
  try {
    const body = req.body || {};
    // Campo trampa: las personas no lo ven, los bots sí lo llenan
    if (typeof body.web === "string" && body.web.trim()) return res.json({ id: 0 });
    if (body.acepto !== true) return res.status(400).json({ error: "Debes aceptar el tratamiento de datos personales" });
    const datos = {};
    all.forEach(q => {
      datos[q.id] = typeof body[q.id] === "string" ? body[q.id].slice(0, 5000) : "";
    });
    const falta = all.filter(q => q.req && !datos[q.id].trim());
    if (falta.length) return res.status(400).json({ error: "Falta: " + falta.map(q => q.l.toLowerCase()).join(", ") });
    datos.acepto_datos = true; // la fecha de aceptación es la fecha de la respuesta (columna creado)
    const r = await pool.query("INSERT INTO respuestas (datos) VALUES ($1) RETURNING id", [datos]);
    res.json({ id: r.rows[0].id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// ---------- Admin ----------
app.get("/admin", auth, async (req, res) => {
  try {
    const POR_PAGINA = 25;
    const q = String(req.query.q || "").trim().slice(0, 100);
    const estado = ESTADOS.includes(req.query.estado) ? req.query.estado : "";
    const pagina = Math.max(1, parseInt(req.query.page, 10) || 1);
    const cond = [], args = [];
    if (q) {
      args.push("%" + q.replace(/[\\%_]/g, "\\$&") + "%");
      cond.push(`(datos->>'marca' ILIKE $${args.length} OR datos->>'nombre' ILIKE $${args.length} OR datos->>'correo' ILIKE $${args.length})`);
    }
    if (estado) { args.push(estado); cond.push(`estado = $${args.length}`); }
    const donde = cond.length ? "WHERE " + cond.join(" AND ") : "";
    const total = parseInt((await pool.query(`SELECT count(*) AS n FROM respuestas ${donde}`, args)).rows[0].n, 10);
    const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    const r = await pool.query(
      `SELECT id, creado, estado, datos FROM respuestas ${donde} ORDER BY id DESC LIMIT ${POR_PAGINA} OFFSET ${(pagina - 1) * POR_PAGINA}`, args);
    const filas = r.rows.map(x => `<tr>
      <td>#${x.id}</td><td>${esc(fecha(x.creado))}</td>
      <td><a href="/admin/${x.id}">${esc(x.datos.marca || "—")}</a></td>
      <td>${esc(x.datos.nombre)}<br><span class="muted">${esc(x.datos.tel)}</span></td>
      <td>${esc(x.datos.presupuesto || "—")}</td><td>${tag(x.estado)}</td></tr>`).join("");
    const enlace = n => `/admin?page=${n}${q ? "&q=" + encodeURIComponent(q) : ""}${estado ? "&estado=" + encodeURIComponent(estado) : ""}`;
    const nav = paginas > 1 ? `<p class="muted">Página ${pagina} de ${paginas} ·
      ${pagina > 1 ? `<a href="${enlace(pagina - 1)}">← Anterior</a>` : ""}
      ${pagina < paginas ? `<a href="${enlace(pagina + 1)}">Siguiente →</a>` : ""}</p>` : "";
    res.send(page("Briefings", `
      <h1>Briefings recibidos</h1>
      <form method="get" action="/admin" class="acciones">
        <input class="campo" name="q" value="${esc(q)}" placeholder="Buscar por negocio, nombre o correo" style="flex:1;min-width:200px">
        <select class="campo" name="estado"><option value="">Todos los estados</option>
          ${ESTADOS.map(e => `<option${e === estado ? " selected" : ""}>${esc(e)}</option>`).join("")}</select>
        <button class="btn" type="submit">Filtrar</button>
        <a class="btn s" href="/admin/export.csv">Descargar CSV</a>
      </form>
      <p class="muted">${total} ${q || estado ? "resultado(s)" : "en total"}</p>
      <table><tr><th>Ref.</th><th>Fecha</th><th>Negocio</th><th>Contacto</th><th>Inversión</th><th>Estado</th></tr>
      ${filas || '<tr><td colspan="6" class="muted">No hay respuestas.</td></tr>'}</table>
      ${nav}`));
  } catch (e) { console.error(e); res.status(500).send("Error del servidor"); }
});

app.get("/admin/export.csv", auth, async (req, res) => {
  try {
    const r = await pool.query("SELECT id, creado, estado, datos FROM respuestas ORDER BY id");
    const cel = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const lineas = [["Ref", "Fecha", "Estado", ...all.map(q => q.l)].map(cel).join(",")];
    r.rows.forEach(x => lineas.push([x.id, fecha(x.creado), x.estado, ...all.map(q => x.datos[q.id])].map(cel).join(",")));
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set("Content-Disposition", 'attachment; filename="briefings-sencia.csv"');
    res.send("﻿" + lineas.join("\r\n"));
  } catch (e) { console.error(e); res.status(500).send("Error del servidor"); }
});

app.get("/admin/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(404).send("No encontrado");
    const r = await pool.query("SELECT id, creado, estado, datos FROM respuestas WHERE id=$1", [id]);
    if (!r.rows.length) return res.status(404).send("No encontrado");
    const { creado, estado, datos } = r.rows[0];
    const secciones = S.map((s, i) => `<section>
      <h2><span class="num">${String(i + 1).padStart(2, "0")}</span>${esc(s.t)}</h2>
      <dl>${s.q.map(q => {
        const v = (datos[q.id] || "").trim();
        return `<dt>${esc(q.l)}</dt><dd class="${v ? "" : "vacio"}">${v ? esc(v) : "—"}</dd>`;
      }).join("")}</dl></section>`).join("");
    res.send(page(`Briefing ${datos.marca || id}`, `
      <h1>${esc(datos.marca || "Briefing")}</h1>
      <p class="muted">Briefing comercial #${id} · ${esc(fecha(creado))} · ${esc(datos.nombre)} · ${tag(estado)}</p>
      <form method="post" action="/admin/${id}/estado" class="acciones">
        <a class="btn s" href="/admin">← Volver</a>
        <select class="campo" name="estado" aria-label="Estado">
          ${ESTADOS.map(e => `<option${e === estado ? " selected" : ""}>${esc(e)}</option>`).join("")}</select>
        <button class="btn" type="submit">Guardar estado</button>
        <button class="btn s" type="button" onclick="window.print()">Imprimir / guardar PDF</button>
      </form>
      ${secciones}`));
  } catch (e) { console.error(e); res.status(500).send("Error del servidor"); }
});

app.post("/admin/:id/estado", auth, mismoOrigen, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const estado = req.body && req.body.estado;
    if (!id || !ESTADOS.includes(estado)) return res.status(400).send("Datos no válidos");
    const r = await pool.query("UPDATE respuestas SET estado=$1 WHERE id=$2", [estado, id]);
    if (!r.rowCount) return res.status(404).send("No encontrado");
    res.redirect(303, "/admin/" + id);
  } catch (e) { console.error(e); res.status(500).send("Error del servidor"); }
});

// ---------- Arranque ----------
if (require.main === module) {
  const port = process.env.PORT || 3000;
  initDb()
    .then(() => app.listen(port, () => console.log("Briefing en puerto " + port)))
    .catch(e => { console.error("No se pudo conectar a la base de datos:", e.message); process.exit(1); });
}
module.exports = { app, initDb };
