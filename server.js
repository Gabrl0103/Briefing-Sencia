const express = require("express");
const crypto = require("crypto");
const path = require("path");
const { Pool } = require("pg");
const PDFDocument = require("pdfkit");
const S = require("./public/questions.js");

const all = S.flatMap(s => s.q);
const ESTADOS = ["Nuevo", "Contactado", "Propuesta enviada", "Cerrado", "Descartado"];
const app = express();
app.set("trust proxy", 1); // detrás del proxy del hosting
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
const sha = s => crypto.createHash("sha256").update(String(s)).digest();
const tokenValido = t => /^[A-Za-z0-9_-]{24,}$/.test(t || "");
// Etiqueta del tipo de briefing (variable TIPO_BRIEFING en Render: "Hogar" o "Comercial")
const TIPO = (process.env.TIPO_BRIEFING || "").trim().slice(0, 20);
const TIPO_COLOR = /hogar|home/i.test(TIPO) ? "#9A5B34" : "#3E5A4C";
const tipoTxt = TIPO ? " " + TIPO.toLowerCase() : "";
const tituloDe = d => d.marca || d.nombre || "";
const subDe = d => (d.marca ? d.nombre : d.correo || d.ciudad) || "";
const slugify = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const urlPublica = () => (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/+$/, "");

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

function page(titulo, cuerpo, base) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}${TIPO ? " · " + esc(TIPO) : ""}</title>
<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Italiana&family=Figtree:wght@400;500;600&display=swap">
<style>${css}body{border-top:6px solid ${TIPO_COLOR}}.tipo{display:inline-block;padding:3px 12px;border-radius:999px;color:#fff;font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;margin-right:10px}</style></head><body><div class="wrap">
<header><a class="brand" href="${esc(base)}">Sencia</a><span class="muted noprint">${TIPO ? `<span class="tipo" style="background:${TIPO_COLOR}">${esc(TIPO)}</span>` : ""}Panel de briefings</span></header>
${cuerpo}</div></body></html>`;
}

const tag = e => `<span class="tag${e === "Nuevo" ? " n" : ""}">${esc(e)}</span>`;

// ---------- Exportar un briefing (CSV y PDF) ----------
const celda = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';

function nombreArchivo(datos, id, ext) {
  const partes = ["briefing", slugify(TIPO), slugify(tituloDe(datos)) || "sin-nombre", id].filter(Boolean);
  return `${partes.join("-")}.${ext}`;
}

function csvUno(id, creado, estado, datos) {
  const filas = [["Sección", "Pregunta", "Respuesta"],
    ...(TIPO ? [["Registro", "Tipo", TIPO]] : []), ["Registro", "Ref.", "#" + id], ["Registro", "Fecha", fecha(creado)], ["Registro", "Estado", estado]];
  S.forEach(s => s.q.forEach(q => filas.push([s.t, q.l, (datos[q.id] || "").trim()])));
  return "﻿" + filas.map(f => f.map(celda).join(",")).join("\r\n");
}

// El PDF usa fuentes estándar: se quitan los caracteres que no soportan (emojis, etc.)
const pdfOk = s => String(s ?? "").replace(/[  ]/g, " ").replace(/\r/g, "")
  .replace(/[^\n -~ -ÿ–—‘’“”•…€]/g, "");

function crearPdf(id, creado, estado, datos) {
  const ACC = "#3E5A4C", MUT = "#626A60", INK = "#20251F", LINE = "#D3D6CE";
  const M = 56;
  const doc = new PDFDocument({
    size: "A4", bufferPages: true,
    margins: { top: M, bottom: 64, left: M, right: M },
    info: { Title: pdfOk(`Briefing${tipoTxt} ${tituloDe(datos) || id}`), Author: "Sencia Estudio" },
  });
  doc.font("Helvetica").fontSize(9).fillColor(ACC).text("SENCIA · ESTUDIO DE DISEÑO INTERIOR" + (TIPO ? " · BRIEFING " + pdfOk(TIPO).toUpperCase() : ""), { characterSpacing: 2 });
  doc.moveDown(1.2).font("Times-Roman").fontSize(26).fillColor(INK).text(pdfOk(tituloDe(datos) || "Briefing"));
  doc.moveDown(0.3).font("Helvetica").fontSize(10).fillColor(MUT)
    .text(pdfOk(`Briefing${tipoTxt} #${id} · ${fecha(creado)} · Estado: ${estado}`));
  S.forEach((s, i) => {
    if (doc.y > doc.page.height - 160) doc.addPage();
    doc.moveDown(1.6).font("Times-Roman").fontSize(16).fillColor(INK).text(`${String(i + 1).padStart(2, "0")}   ${pdfOk(s.t)}`);
    const y = doc.y + 3;
    doc.moveTo(M, y).lineTo(doc.page.width - M, y).lineWidth(0.7).strokeColor(LINE).stroke();
    doc.moveDown(0.7);
    s.q.forEach(q => {
      const v = (datos[q.id] || "").trim();
      if (doc.y > doc.page.height - 110) doc.addPage();
      doc.font("Helvetica").fontSize(8.5).fillColor(MUT).text(pdfOk(q.l));
      doc.font("Helvetica").fontSize(11).fillColor(v ? INK : MUT).text(v ? pdfOk(v) : "—");
      doc.moveDown(0.6);
    });
  });
  const rango = doc.bufferedPageRange();
  for (let i = 0; i < rango.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0; // para poder escribir el pie sin que cree otra página
    doc.font("Helvetica").fontSize(8).fillColor(MUT).text(
      `Sencia Estudio · Briefing #${id} · Página ${i + 1} de ${rango.count}`,
      M, doc.page.height - 40, { align: "center", width: doc.page.width - 2 * M, lineBreak: false });
  }
  return doc;
}

async function cargarBriefing(id) {
  const r = await pool.query("SELECT id, creado, estado, datos FROM respuestas WHERE id=$1", [id]);
  return r.rows[0] || null;
}

// ---------- Avisos automáticos (correo y WhatsApp) ----------
function correoHtml(id, datos, link) {
  const secciones = S.map((s, i) => {
    const filas = s.q.map(q => {
      const v = (datos[q.id] || "").trim();
      return `<tr><td style="padding:6px 12px 6px 0;color:#626A60;vertical-align:top;width:40%">${esc(q.l)}</td>
        <td style="padding:6px 0;white-space:pre-wrap">${v ? esc(v) : "—"}</td></tr>`;
    }).join("");
    return `<h3 style="font-family:Georgia,serif;font-weight:400;border-bottom:1px solid #D3D6CE;padding-bottom:6px;margin:28px 0 8px">
      ${String(i + 1).padStart(2, "0")} · ${esc(s.t)}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${filas}</table>`;
  }).join("");
  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#20251F;line-height:1.5">
    <p style="letter-spacing:.3em;text-transform:uppercase;font-size:13px;margin:0">Sencia · Briefing${esc(tipoTxt)}</p>
    <h2 style="font-family:Georgia,serif;font-weight:400;font-size:28px;margin:12px 0 4px">${esc(tituloDe(datos))}</h2>
    <p style="color:#626A60;margin:0 0 16px">Briefing #${id} · ${esc(datos.tel)}</p>
    ${link ? `<p><a href="${esc(link)}" style="display:inline-block;background:${TIPO_COLOR};color:#F4F6F1;padding:10px 16px;border-radius:4px;text-decoration:none;font-weight:600">Abrir en el panel</a></p>` : ""}
    ${secciones}</div>`;
}

async function enviarCorreo(id, datos, link) {
  const key = process.env.RESEND_API_KEY, para = process.env.NOTIFY_EMAIL;
  if (!key || !para) return;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Briefing Sencia <onboarding@resend.dev>",
      to: para.split(",").map(s => s.trim()).filter(Boolean),
      subject: `${TIPO ? "[" + TIPO.toUpperCase() + "] " : ""}Nuevo briefing: ${tituloDe(datos)} (#${id})`,
      html: correoHtml(id, datos, link),
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) console.error("Resend falló:", r.status, await r.text());
}

// WhatsApp vía CallMeBot. Mensaje corto a propósito: sin teléfono del cliente ni link del panel.
async function enviarWhatsapp(id, datos) {
  const key = process.env.CALLMEBOT_APIKEY;
  const num = (process.env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
  if (!key || !num) return;
  const texto = `Nuevo briefing${TIPO ? " de " + TIPO.toUpperCase() : ""} #${id}: ${tituloDe(datos)}${datos.marca ? " (" + datos.nombre + ")" : ""}. Revisa tu correo o tu panel para ver las respuestas.`;
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent("+" + num)}&text=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(key)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!r.ok) console.error("CallMeBot falló:", r.status, await r.text());
}

async function notificar(id, datos) {
  const base = urlPublica();
  const t = process.env.ADMIN_TOKEN;
  const link = base && tokenValido(t) ? `${base}/panel/${t}/${id}` : "";
  const res = await Promise.allSettled([enviarCorreo(id, datos, link), enviarWhatsapp(id, datos)]);
  res.forEach(x => { if (x.status === "rejected") console.error("Aviso falló:", x.reason && x.reason.message); });
}

// ---------- API pública ----------
app.get("/api/config", (req, res) => {
  // El botón manual de WhatsApp del formulario solo aparece si no hay aviso automático
  const manual = process.env.CALLMEBOT_APIKEY ? "" : (process.env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
  res.json({ whatsapp: manual });
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
    const id = r.rows[0].id;
    res.json({ id });
    notificar(id, datos).catch(e => console.error("Aviso falló:", e.message)); // no frena la respuesta al cliente
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// ---------- Panel privado: /panel/<ADMIN_TOKEN> ----------
// No hay contraseña que escribir: el acceso es el link secreto. Quien no tenga el link recibe "No encontrado".
const panel = express.Router();
app.use("/panel/:token", (req, res, next) => {
  const t = process.env.ADMIN_TOKEN;
  if (!tokenValido(t)) return res.status(500).send("Configura ADMIN_TOKEN: mínimo 24 letras o números, sin espacios ni símbolos.");
  if (!crypto.timingSafeEqual(sha(req.params.token), sha(t))) return res.status(404).send("No encontrado");
  res.set({ "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
  next();
}, panel);

panel.get("/", async (req, res) => {
  try {
    const base = req.baseUrl;
    const POR_PAGINA = 25;
    const q = String(req.query.q || "").trim().slice(0, 100);
    const estado = ESTADOS.includes(req.query.estado) ? req.query.estado : "";
    const pagina = Math.max(1, parseInt(req.query.page, 10) || 1);
    const cond = [], args = [];
    if (q) {
      args.push("%" + q.replace(/[\\%_]/g, "\\$&") + "%");
      cond.push(`(datos->>'marca' ILIKE $${args.length} OR datos->>'nombre' ILIKE $${args.length} OR datos->>'correo' ILIKE $${args.length} OR datos->>'barrio' ILIKE $${args.length})`);
    }
    if (estado) { args.push(estado); cond.push(`estado = $${args.length}`); }
    const donde = cond.length ? "WHERE " + cond.join(" AND ") : "";
    const total = parseInt((await pool.query(`SELECT count(*) AS n FROM respuestas ${donde}`, args)).rows[0].n, 10);
    const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    const r = await pool.query(
      `SELECT id, creado, estado, datos FROM respuestas ${donde} ORDER BY id DESC LIMIT ${POR_PAGINA} OFFSET ${(pagina - 1) * POR_PAGINA}`, args);
    const filas = r.rows.map(x => `<tr>
      <td>#${x.id}</td><td>${esc(fecha(x.creado))}</td>
      <td><a href="${esc(base)}/${x.id}">${esc(tituloDe(x.datos) || "—")}</a></td>
      <td>${esc(x.datos.tel)}<br><span class="muted">${esc(subDe(x.datos))}</span></td>
      <td>${esc(x.datos.presupuesto || "—")}</td><td>${tag(x.estado)}</td></tr>`).join("");
    const enlace = n => `${base}?page=${n}${q ? "&q=" + encodeURIComponent(q) : ""}${estado ? "&estado=" + encodeURIComponent(estado) : ""}`;
    const nav = paginas > 1 ? `<p class="muted">Página ${pagina} de ${paginas} ·
      ${pagina > 1 ? `<a href="${esc(enlace(pagina - 1))}">← Anterior</a>` : ""}
      ${pagina < paginas ? `<a href="${esc(enlace(pagina + 1))}">Siguiente →</a>` : ""}</p>` : "";
    res.send(page("Briefings", `
      <h1>Briefings${esc(tipoTxt)} recibidos</h1>
      <form method="get" action="${esc(base)}" class="acciones">
        <input class="campo" name="q" value="${esc(q)}" placeholder="Buscar por nombre, negocio, correo o barrio" style="flex:1;min-width:200px">
        <select class="campo" name="estado"><option value="">Todos los estados</option>
          ${ESTADOS.map(e => `<option${e === estado ? " selected" : ""}>${esc(e)}</option>`).join("")}</select>
        <button class="btn" type="submit">Filtrar</button>
        <a class="btn s" href="${esc(base)}/export.csv">Descargar CSV</a>
      </form>
      <p class="muted">${total} ${q || estado ? "resultado(s)" : "en total"}</p>
      <table><tr><th>Ref.</th><th>Fecha</th><th>Cliente</th><th>Contacto</th><th>Inversión</th><th>Estado</th></tr>
      ${filas || '<tr><td colspan="6" class="muted">No hay respuestas.</td></tr>'}</table>
      ${nav}`, base));
  } catch (e) { console.error(e); res.status(500).send("Error del servidor"); }
});

panel.get("/export.csv", async (req, res) => {
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

panel.get("/:id/export.csv", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const b = id && await cargarBriefing(id);
    if (!b) return res.status(404).send("No encontrado");
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set("Content-Disposition", `attachment; filename="${nombreArchivo(b.datos, id, "csv")}"`);
    res.send(csvUno(id, b.creado, b.estado, b.datos));
  } catch (e) { console.error(e); res.status(500).send("Error del servidor"); }
});

panel.get("/:id/export.pdf", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const b = id && await cargarBriefing(id);
    if (!b) return res.status(404).send("No encontrado");
    const doc = crearPdf(id, b.creado, b.estado, b.datos);
    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", `attachment; filename="${nombreArchivo(b.datos, id, "pdf")}"`);
    doc.pipe(res);
    doc.end();
  } catch (e) { console.error(e); if (!res.headersSent) res.status(500).send("Error del servidor"); }
});

panel.get("/:id", async (req, res) => {
  try {
    const base = req.baseUrl;
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
    res.send(page(`Briefing ${tituloDe(datos) || id}`, `
      <h1>${esc(tituloDe(datos) || "Briefing")}</h1>
      <p class="muted">Briefing${esc(tipoTxt)} #${id} · ${esc(fecha(creado))} · ${esc(datos.tel)} · ${tag(estado)}</p>
      <form method="post" action="${esc(base)}/${id}/estado" class="acciones">
        <a class="btn s" href="${esc(base)}">← Volver</a>
        <select class="campo" name="estado" aria-label="Estado">
          ${ESTADOS.map(e => `<option${e === estado ? " selected" : ""}>${esc(e)}</option>`).join("")}</select>
        <button class="btn" type="submit">Guardar estado</button>
        <a class="btn s" href="${esc(base)}/${id}/export.pdf">Descargar PDF</a>
        <a class="btn s" href="${esc(base)}/${id}/export.csv">Descargar CSV</a>
      </form>
      ${secciones}`, base));
  } catch (e) { console.error(e); res.status(500).send("Error del servidor"); }
});

panel.post("/:id/estado", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const estado = req.body && req.body.estado;
    if (!id || !ESTADOS.includes(estado)) return res.status(400).send("Datos no válidos");
    const r = await pool.query("UPDATE respuestas SET estado=$1 WHERE id=$2", [estado, id]);
    if (!r.rowCount) return res.status(404).send("No encontrado");
    res.redirect(303, `${req.baseUrl}/${id}`);
  } catch (e) { console.error(e); res.status(500).send("Error del servidor"); }
});

// ---------- Arranque ----------
if (require.main === module) {
  const port = process.env.PORT || 3000;
  if (!tokenValido(process.env.ADMIN_TOKEN)) console.warn("AVISO: falta ADMIN_TOKEN válido; el panel no abrirá.");
  initDb()
    .then(() => app.listen(port, () => console.log("Briefing en puerto " + port)))
    .catch(e => { console.error("No se pudo conectar a la base de datos:", e.message); process.exit(1); });
}
module.exports = { app, initDb };
