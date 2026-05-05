const router = require("express").Router()
const { execFile, spawn } = require("child_process")
const { promisify } = require("util")
const yts = require("yt-search")
const { requireAuth, requireApiKey } = require("../middleware/auth")

const execFileAsync = promisify(execFile)

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
  const m4a  = audioOnly.filter(f => f.ext === "m4a")
  const pool = m4a.length ? m4a : audioOnly
  return pool.sort((a, b) => (b.abr || 0) - (a.abr || 0))[0] || null
}

// GET /api/music/play?q=cancion  —  requiere API Key (mbk_...)
router.get("/play", requireApiKey, async (req, res) => {
  const q = req.query.q
  if (!q) return res.status(400).json({ error: "Parametro 'q' requerido", ejemplo: "/api/music/play?q=bad+bunny" })

  const searchResult = await yts(q)
  if (!searchResult.videos.length) return res.status(404).json({ error: "No se encontraron resultados para: " + q })

  const video    = searchResult.videos[0]
  const videoUrl = "https://www.youtube.com/watch?v=" + video.videoId

  const [info, audioUrl] = await Promise.all([getVideoInfo(videoUrl), getAudioUrl(videoUrl)])

  res.json({
    videoId:         video.videoId,
    title:           info?.title           ?? video.title,
    url:             videoUrl,
    thumbnail:       info?.thumbnail       ?? video.thumbnail,
    duration:        info?.duration_string ?? video.duration.timestamp,
    durationSeconds: info?.duration        ?? null,
    author:          info?.uploader        ?? video.author.name,
    audioUrl:        audioUrl ?? videoUrl,          // CDN directo, expira ~6h
    streamUrl:       "/api/music/stream/" + video.videoId, // este servidor, no expira
    audioAvailable:  audioUrl !== null,
  })
})

// GET /api/music/stream/:videoId  —  streaming real via yt-dlp
// Uso en Baileys: fetch → arrayBuffer() → Buffer → sendMessage(audio: buffer)
router.get("/stream/:videoId", requireApiKey, async (req, res) => {
  const videoId = req.params.videoId.replace(/[^a-zA-Z0-9_-]/g, "")
  if (!videoId) return res.status(400).json({ error: "videoId invalido" })

  const videoUrl = "https://www.youtube.com/watch?v=" + videoId
  const info     = await getVideoInfo(videoUrl)
  if (!info) return res.status(404).json({ error: "Video no encontrado o no disponible" })

  const fmt      = bestAudioFormat(info.formats)
  const mimeType = fmt?.ext === "webm" ? "audio/webm" : "audio/mp4"
  const ext      = fmt?.ext === "webm" ? "webm" : "m4a"

  res.setHeader("Content-Type", mimeType)
  res.setHeader("Content-Disposition", `inline; filename="${videoId}.${ext}"`)
  if (fmt?.filesize) res.setHeader("Content-Length", fmt.filesize)
  res.setHeader("Accept-Ranges", "bytes")

  const ytdlp = spawn("yt-dlp", [
    "--format", "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best",
    "--no-playlist", "--quiet", "-o", "-", videoUrl,
  ])

  ytdlp.stdout.pipe(res)
  req.on("close", () => { if (!ytdlp.killed) ytdlp.kill("SIGTERM") })
  ytdlp.on("error", () => {
    if (!res.headersSent) res.status(500).json({ error: "yt-dlp no encontrado. Instala con: pip install yt-dlp" })
  })
  ytdlp.on("close", code => {
    if (code !== 0 && !res.headersSent) res.status(502).json({ error: "Error en yt-dlp (codigo: " + code + ")" })
  })
})

// GET /api/music/search?q=cancion  —  para el panel web, requiere JWT
router.get("/search", requireAuth, async (req, res) => {
  const q = req.query.q
  if (!q) return res.status(400).json({ error: "Parametro 'q' requerido" })
  const result = await yts(q)
  res.json(result.videos.slice(0, 10).map(v => ({
    videoId:   v.videoId,
    title:     v.title,
    url:       "https://www.youtube.com/watch?v=" + v.videoId,
    thumbnail: v.thumbnail,
    duration:  v.duration.timestamp,
    author:    v.author.name,
    streamUrl: "/api/music/stream/" + v.videoId,
  })))
})

module.exports = router
