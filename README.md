# Briefing Sencia (hogar y comercial)

Un solo servicio con los dos briefings, una sola base de datos y un solo panel.

## Direcciones

| Dirección | Para qué |
|---|---|
| `https://TU-DOMINIO/hogar` | Briefing para el hogar (link para clientes) |
| `https://TU-DOMINIO/comercial` | Briefing para proyectos comerciales (link para clientes) |
| `https://TU-DOMINIO/` | Página que deja elegir entre los dos |
| `https://TU-DOMINIO/panel/ADMIN_TOKEN` | Panel privado de Manuela (hogar y comercial juntos) |

## Variables de entorno

| Variable | Qué es |
|---|---|
| `DATABASE_URL` | Conexión a Postgres (Neon). Sin `channel_binding=require` |
| `PGSSL` | `true` cuando la base es Neon |
| `ADMIN_TOKEN` | Parte secreta del link del panel. 24+ letras o números, sin símbolos ni espacios |
| `NOTIFY_EMAIL` | Correo(s) que reciben cada briefing, separados por coma |
| `RESEND_API_KEY` | Clave de Resend para enviar el correo |
| `EMAIL_FROM` | (opcional) Remitente. Por defecto `Briefing Sencia <onboarding@resend.dev>` |
| `WHATSAPP_NUMBER` | Número de Manuela con indicativo, sin + ni espacios (ej. `573001234567`) |
| `CALLMEBOT_APIKEY` | Clave de CallMeBot para el aviso automático por WhatsApp |
| `PUBLIC_URL` | (opcional en Render) Dirección pública, ej. `https://briefing-sencia.onrender.com` |

Todo lo de correo y WhatsApp es opcional: si falta, simplemente no se envía ese aviso y las respuestas se guardan igual.

## Panel

- Pestañas **Todos / Hogar / Comercial** con el número de briefings de cada uno.
- Cada fila muestra una etiqueta de color: **Hogar** (terracota) y **Comercial** (verde).
- Búsqueda, filtro por estado y estados (Nuevo, Contactado, Propuesta enviada, Cerrado, Descartado).
- Cada briefing se exporta por separado en PDF y CSV. El CSV general sale como resumen en "Todos" y completo si estás en una pestaña de tipo.
- Los correos llegan con el asunto `[HOGAR]` o `[COMERCIAL]`, y el WhatsApp dice de qué tipo es.

## Cómo funciona

- `public/questions-hogar.js` y `public/questions-comercial.js`: las preguntas de cada briefing.
- `formulario.html`: la plantilla del formulario, que se llena con los textos de cada tipo.
- `server.js`: guarda las respuestas, sirve los formularios y el panel, y manda los avisos.

## Probar en local

```
npm install
DATABASE_URL=postgres://usuario:clave@localhost:5432/briefing ADMIN_TOKEN=unaclavemuylargade24letras npm start
```
