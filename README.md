# MusicBot API v2

API de música para bots de WhatsApp con streaming real via yt-dlp.
**100% compatible con Linux, Windows y Render.com — sin módulos nativos.**

## Dependencias Node.js (todas puras JavaScript)
| Paquete | Por qué |
|---------|---------|
| `express` | Servidor web |
| `bcryptjs` | Hash de passwords (JS puro — reemplaza `bcrypt` nativo) |
| `jsonwebtoken` | Tokens JWT |
| `yt-search` | Búsqueda en YouTube |
| `cors` | Headers CORS |

No hay `bcrypt`, `better-sqlite3` ni ningún módulo con binarios nativos.

---

## Instalación

```bash
pip install yt-dlp       # yt-dlp es requerido para el streaming
npm install              # instala solo JS puro, sin compilar nada
node server.js           # arranca en http://localhost:3000
```

---

## Deploy en Render.com

| Campo | Valor |
|-------|-------|
| **Build Command** | `npm install && pip install yt-dlp` |
| **Start Command** | `node server.js` |
| **Variable de entorno** | `SESSION_SECRET=secreto-seguro-largo` |

Los datos se guardan en `data.json` (se crea automáticamente). No necesitas base de datos externa.

---

## Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/healthz` | No | Estado del servidor |
| POST | `/api/auth/register` | No | Crear cuenta → recibe API Key |
| POST | `/api/auth/login` | No | Login → recibe JWT |
| GET | `/api/auth/me` | JWT | Info del usuario |
| GET | `/api/keys` | JWT | Ver tu API Key |
| POST | `/api/keys/regenerate` | JWT | Regenerar API Key |
| GET | `/api/music/play?q=...` | **API Key** | Buscar canción + URLs de audio |
| GET | `/api/music/stream/:videoId` | **API Key** | Streaming real de audio (m4a) |
| GET | `/api/music/search?q=...` | JWT | Búsqueda para el panel web |
| GET | `/api/stats/me` | JWT | Estadísticas de uso |

---

## Probar en Postman

### 1. Registrarse (obtén tu API Key)
```
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{ "username": "mibot", "email": "bot@mail.com", "password": "mipass123" }
```
→ Respuesta: `{ "token": "...", "apiKey": "mbk_..." }`  — guarda el `apiKey`

### 2. Buscar canción
```
GET http://localhost:3000/api/music/play?q=bad+bunny
Authorization: Bearer mbk_TU_API_KEY
```
→ Respuesta con `title`, `duration`, `audioUrl`, `streamUrl`, etc.

### 3. Descargar audio real (Postman → "Send and Download")
```
GET http://localhost:3000/api/music/stream/Cr8K88UcO0s
Authorization: Bearer mbk_TU_API_KEY
```
→ Guarda como `.m4a` y reprodúcelo localmente para verificar.

---

## Uso en Baileys

```js
const API_URL = "https://tu-app.onrender.com"
const API_KEY = "mbk_TU_API_KEY"
const H = { Authorization: `Bearer ${API_KEY}` }

if (text.startsWith(".play ")) {
  const q = text.replace(".play ", "").trim()

  const { streamUrl, title, duration, author } = await fetch(
    `${API_URL}/api/music/play?q=${encodeURIComponent(q)}`, { headers: H }
  ).then(r => r.json())

  const buffer = Buffer.from(
    await fetch(`${API_URL}${streamUrl}`, { headers: H }).then(r => r.arrayBuffer())
  )

  await sock.sendMessage(jid, { audio: buffer, mimetype: "audio/mp4", ptt: false })
  await sock.sendMessage(jid, { text: `🎵 *${title}*\n👤 ${author} | ⏱ ${duration}` })
}
```
