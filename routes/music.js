const router = require("express").Router()
const { execFile, spawn } = require("child_process")
const { promisify } = require("util")
const yts = require("yt-search")
const { requireAuth, requireApiKey } = require("../middleware/auth")

const execFileAsync = promisify(execFile)

// ── helpers yt-dlp ────────────────────────────────────────────────────────────

async function getVideoInfo(videoUrl) {
  try {
    const { stdout } = await execFileAsync("yt-dlp", [
      "--dump-json", "--no-playlist", "--quiet", videoUrl,
    ], { timeout: 15000 })
    return JSON.parse(stdout)
  } catch { return null }
}

async function getAudioUrl(videoUrl) {
  try {
    const { stdout } = await execFileAsync("yt-dlp", [
      "--get-url",
      "--format", "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best",
      "--no-playlist", "--quiet", videoUrl,
    ], { timeout: 15000 })
    return stdout.trim().split("\n")[0] || null
  } catch { return null }
}

function bestAudioFormat(formats) {
  const audioOnly = (formats || []).filter(f => f.acodec !== "none" && f.vcodec === "none")
  const m4a = audioOnly.filter(f => f.ext === "m4a")
  const pool = m4a.length ? m4a : audioOnly
  return pool.sort((a, b) => (b.abr || 0) - (a.abr || 0))[0] || null
}

// ── GET /api/music/play?q=cancion ─────────────────────────────────────────────
// Para el bot de WhatsApp — requiere API Key
router.get("/play", requireApiKey, async (req, res) => {
  const q = req.query.q
  if (!q) {
    return res.status(400).json({
      error: "Parametro 'q' requerido",
      ejemplo: "/api/music/play?q=bad+bunny"
    })
  }

  // 1. Buscar en YouTube
  const searchResult = await yts(q)
  if (!searchResult.videos.length) {
    return res.status(404).json({ error: "No se encontraron resultados para: " + q })
  }

  const video = searchResult.videos[0]
  const videoUrl = "https://www.youtube.com/watch?v=" + video.videoId

  // 2. Obtener metadata e info en paralelo
  const [info, audioUrl] = await Promise.all([
    getVideoInfo(videoUrl),
    getAudioUrl(videoUrl),
  ])

  // 3. streamUrl es estable (no expira) — recomendado para bots
  const streamUrl = "/api/music/stream/" + video.videoId

  res.json({
    videoId: video.videoId,
    title: info?.title ?? video.title,
    url: videoUrl,
    thumbnail: info?.thumbnail ?? video.thumbnail,
    duration: info?.duration_string ?? video.duration.timestamp,
    durationSeconds: info?.duration ?? null,
    author: info?.uploader ?? video.author.name,
    // audioUrl: CDN directo de YouTube (expira ~6h, para uso inmediato)
    audioUrl: audioUrl ?? videoUrl,
    // streamUrl: este servidor (no expira, ideal para Baileys)
    streamUrl,
    audioAvailable: audioUrl !== null,
  })
})

// ── GET /api/music/stream/:videoId ────────────────────────────────────────────
// Streaming REAL: yt-dlp descarga y pasa audio en tiempo real al cliente
// Compatible Baileys: fetch(url) → arrayBuffer() → Buffer → sendMessage(audio)
router.get("/stream/:videoId", requireApiKey, async (req, res) => {
  const videoId = req.params.videoId.replace(/[^a-zA-Z0-9_-]/g, "")
  if (!videoId) return res.status(400).json({ error: "videoId invalido" })

  const videoUrl = "https://www.youtube.com/watch?v=" + videoId

  // Obtener info del video para headers correctos
  const info = await getVideoInfo(videoUrl)
  if (!info) {
    return res.status(404).json({ error: "Video no encontrado o no disponible" })
  }

  const fmt = bestAudioFormat(info.formats)
  const mimeType = fmt?.ext === "webm" ? "audio/webm" : "audio/mp4"
  const ext = fmt?.ext === "webm" ? "webm" : "m4a"

  // Headers para compatibilidad con Baileys y reproductores de audio
  res.setHeader("Content-Type", mimeType)
  res.setHeader("Content-Disposition", `inline; filename="${videoId}.${ext}"`)
  if (fmt?.filesize) res.setHeader("Content-Length", fmt.filesize)
  res.setHeader("Accept-Ranges", "bytes")

  // yt-dlp pipa audio directo a stdout -> Express response
  const ytdlp = spawn("yt-dlp", [
    "--format", "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best",
    "--no-playlist",
    "--quiet",
    "-o", "-",
    videoUrl,
  ])

  ytdlp.stdout.pipe(res)

  // Si el cliente desconecta, matar yt-dlp para liberar recursos
  req.on("close", () => { if (!ytdlp.killed) ytdlp.kill("SIGTERM") })

  ytdlp.on("error", () => {
    if (!res.headersSent) res.status(500).json({ error: "Error iniciando stream de audio" })
  })

  ytdlp.on("close", (code) => {
    if (code !== 0 && !res.headersSent) {
      res.status(502).json({ error: "Error en yt-dlp (codigo: " + code + ")" })
    }
  })
})

// ── GET /api/music/search?q=cancion ──────────────────────────────────────────
// Para el panel web — requiere JWT (no API Key)
router.get("/search", requireAuth, async (req, res) => {
  const q = req.query.q
  if (!q) return res.status(400).json({ error: "Parametro 'q' requerido" })

  const searchResult = await yts(q)
  res.json(searchResult.videos.slice(0, 10).map(v => ({
    videoId: v.videoId,
    title: v.title,
    url: "https://www.youtube.com/watch?v=" + v.videoId,
    thumbnail: v.thumbnail,
    duration: v.duration.timestamp,
    author: v.author.name,
    streamUrl: "/api/music/stream/" + v.videoId,
  })))
})

module.exports = router
