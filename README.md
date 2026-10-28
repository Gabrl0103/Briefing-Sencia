# Briefing Sencia

Formulario del briefing + guardado de respuestas en Postgres + panel privado + avisos automáticos por correo y WhatsApp.

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
| `PUBLIC_URL` | (opcional en Render) Dirección pública, ej. `https://briefing.onrender.com` |

Todo lo de correo y WhatsApp es opcional: si falta, simplemente no se envía ese aviso y las respuestas se guardan igual.

## Panel privado

Se abre en `https://TU-DOMINIO/panel/ADMIN_TOKEN` (no hay contraseña: el acceso es el link, guárdalo como favorito y no lo compartas). Desde ahí se ven los briefings, se buscan, se filtran por estado, se exportan a CSV y se imprimen como PDF.

## Cómo funciona

- `public/questions.js`: todas las preguntas. Si cambias una, cambia en el formulario, el panel y el correo.
- `public/index.html`: el formulario.
- `server.js`: guarda las respuestas (`POST /api/respuestas`), sirve el panel y manda los avisos.

## Probar en local

```
npm install
DATABASE_URL=postgres://usuario:clave@localhost:5432/briefing ADMIN_TOKEN=unaclavemuylargade24letras npm start
```
