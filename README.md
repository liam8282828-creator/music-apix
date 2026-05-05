# MusicBot API

API de música para bots de WhatsApp con **streaming real** via yt-dlp.
**100% compatible con Linux, Windows y Render.com** (sin módulos nativos).

---

## Instalación rápida

```bash
# 1. Instalar yt-dlp (REQUERIDO — para streaming de audio)
pip install yt-dlp

# 2. Instalar dependencias Node.js
npm install

# 3. Iniciar servidor
node server.js
```

Abre el panel web en: **http://localhost:3000**

---

## Deploy en Render.com

| Campo | Valor |
|-------|-------|
| **Build Command** | `npm install && pip install yt-dlp` |
| **Start Command** | `node server.js` |
| **Variables de entorno** | `SESSION_SECRET=tu-secreto-seguro` |

> yt-dlp se instala en el step de build. Render usa Linux nativo, compatible.

---

## Obtener tu API Key

1. Abre `http://localhost:3000` (o tu dominio en Render)
2. Regístrate → API Key generada automáticamente
3. Ve a **API Keys** en el menú → copia tu key (`mbk_...`)

---

## Autenticación

Todos los endpoints del bot usan **Bearer Token**:

```
Authorization: Bearer mbk_TU_API_KEY
```

---

## Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | /api/healthz | No | Estado del servidor |
| POST | /api/auth/register | No | Crear cuenta → API Key automática |
| POST | /api/auth/login | No | Login → token JWT |
| GET | /api/auth/me | JWT | Info del usuario |
| GET | /api/keys | JWT | Ver API Key |
| POST | /api/keys/regenerate | JWT | Regenerar API Key |
| GET | /api/music/play?q=... | **API Key** | Buscar canción + metadata |
| GET | /api/music/stream/:videoId | **API Key** | **Streaming real de audio** |
| GET | /api/music/search?q=... | JWT | Búsqueda para el panel web |
| GET | /api/stats/me | JWT | Estadísticas de uso |

---

## Probar en Postman

### 1. Registrarse
```
POST /api/auth/register
Content-Type: application/json

{ "username": "mibot", "email": "bot@ejemplo.com", "password": "mipass123" }
```
Respuesta: `{ "token": "...", "apiKey": "mbk_..." }`

### 2. Buscar canción
```
GET /api/music/play?q=bad+bunny
Authorization: Bearer mbk_TU_API_KEY
```

### 3. Descargar audio (Postman → Send and Download)
```
GET /api/music/stream/Cr8K88UcO0s
Authorization: Bearer mbk_TU_API_KEY
```
Guarda el archivo como `.m4a` y reprodúcelo.

---

## Respuesta de /play

```json
{
  "videoId": "Cr8K88UcO0s",
  "title": "Bad Bunny - Tití Me Preguntó",
  "url": "https://www.youtube.com/watch?v=Cr8K88UcO0s",
  "thumbnail": "https://i.ytimg.com/vi/Cr8K88UcO0s/maxresdefault.jpg",
  "duration": "4:50",
  "durationSeconds": 290,
  "author": "Bad Bunny",
  "audioUrl": "https://rr4---sn-....googlevideo.com/...",
  "streamUrl": "/api/music/stream/Cr8K88UcO0s",
  "audioAvailable": true
}
```

**`streamUrl`** → endpoint estable de este servidor, no expira. Úsalo en Baileys.
**`audioUrl`** → URL directa del CDN de YouTube, expira en ~6h.

---

## Uso en bot Baileys (código completo)

```js
const API_URL = "https://tu-app.onrender.com"  // o http://localhost:3000
const API_KEY = "mbk_TU_API_KEY"

const HEADERS = { Authorization: `Bearer ${API_KEY}` }

// Comando: .play nombre de cancion
if (text.startsWith(".play ")) {
  const query = text.replace(".play ", "").trim()

  // 1. Buscar canción
  const playRes = await fetch(
    `${API_URL}/api/music/play?q=${encodeURIComponent(query)}`,
    { headers: HEADERS }
  )
  if (!playRes.ok) {
    await sock.sendMessage(jid, { text: "❌ No encontré esa canción." })
    return
  }
  const { title, streamUrl, duration, author, thumbnail } = await playRes.json()

  // 2. Descargar audio via streaming real (no expira)
  const audioRes = await fetch(`${API_URL}${streamUrl}`, { headers: HEADERS })
  const buffer = Buffer.from(await audioRes.arrayBuffer())

  // 3. Enviar audio en WhatsApp
  await sock.sendMessage(jid, {
    audio: buffer,
    mimetype: "audio/mp4",
    ptt: false  // false = archivo de audio, true = nota de voz
  })

  // Opcional: info de la canción
  await sock.sendMessage(jid, {
    text: `🎵 *${title}*\n👤 ${author} | ⏱ ${duration}`
  })
}
```

---

## ¿Por qué bcryptjs y no bcrypt?

`bcrypt` usa módulos nativos C++ (`.node`) que se compilan para el OS actual.
Al deployar en otro OS (Windows → Linux/Render), esos binarios fallan con:
```
Error: bcrypt_lib.node: invalid ELF header
```

`bcryptjs` es **100% JavaScript puro** — funciona igual en cualquier plataforma.
