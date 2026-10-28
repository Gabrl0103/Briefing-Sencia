# Briefing Sencia

Formulario del briefing + guardado de respuestas en Postgres + panel `/admin`.

## Variables de entorno

| Variable | Qué es |
|---|---|
| `DATABASE_URL` | La pone Railway sola al enlazar Postgres |
| `ADMIN_PASSWORD` | Clave para entrar a `/admin` (usuario: lo que quieras). **Mínimo 12 caracteres**, si no el panel no abre |
| `WHATSAPP_NUMBER` | (opcional) Número de Manuela con indicativo, sin + ni espacios. Ej: `573001234567` |

## Subir a Railway

1. Sube esta carpeta a un repo nuevo en GitHub.
2. En Railway: **New Project → Deploy from GitHub repo** y elige el repo.
3. En el mismo proyecto: **New → Database → Add PostgreSQL**.
4. En el servicio de la app → **Variables**:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (referencia al Postgres)
   - `ADMIN_PASSWORD` = tu clave
   - `WHATSAPP_NUMBER` = número de Manuela
5. En el servicio de la app → **Settings → Networking → Generate Domain**.
6. Abre el dominio: ahí está el formulario. El panel está en `/admin`.

## Probar en local

```
npm install
DATABASE_URL=postgres://usuario:clave@localhost:5432/briefing ADMIN_PASSWORD=1234 npm start
```

## Cómo funciona

- `public/questions.js`: todas las preguntas. Si cambias una, cambia en el formulario y en el admin.
- `public/index.html`: el formulario. Al enviar guarda en la base y muestra el botón de WhatsApp (aviso corto con el número de referencia).
- `server.js`: guarda las respuestas (`POST /api/respuestas`) y sirve el panel `/admin`, la ficha de cada briefing y el CSV.
