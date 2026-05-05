const jwt = require("jsonwebtoken")
const db  = require("../db")

const JWT_SECRET = process.env.SESSION_SECRET || "musicbot-secret-cambia-en-produccion"

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" })
}

function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET) } catch { return null }
}

// Extrae Bearer token — soporta cualquier capitalización del header
function extractBearer(req) {
  const raw = req.headers["authorization"] || req.headers["Authorization"] || ""
  if (!raw.toLowerCase().startsWith("bearer ")) return null
  return raw.slice(7).trim() || null
}

function requireAuth(req, res, next) {
  const token = extractBearer(req)
  if (!token) {
    return res.status(401).json({
      error: "Token JWT requerido",
      uso: "Authorization: Bearer TU_TOKEN_JWT",
    })
  }
  const payload = verifyToken(token)
  if (!payload) {
    return res.status(401).json({ error: "Token invalido o expirado. Inicia sesion de nuevo." })
  }
  const user = db.getUserById(payload.userId)
  if (!user) return res.status(401).json({ error: "Usuario no encontrado" })
  req.user = user
  next()
}

function requireApiKey(req, res, next) {
  const key = extractBearer(req)
  if (!key) {
    return res.status(401).json({
      error: "API Key requerida",
      uso: "Authorization: Bearer mbk_TU_API_KEY",
    })
  }
  const apiKey = db.getApiKeyByKey(key)
  if (!apiKey) {
    return res.status(401).json({
      error: "API Key invalida. Obtenla en el panel web despues de registrarte.",
      hint: "La key empieza con 'mbk_'",
    })
  }
  db.updateApiKey(apiKey.id, {
    last_used_at: new Date().toISOString(),
    usage_count: apiKey.usage_count + 1,
  })
  req.apiKey = apiKey
  next()
}

function generateApiKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let key = "mbk_"
  for (let i = 0; i < 32; i++) key += chars[Math.floor(Math.random() * chars.length)]
  return key
}

module.exports = { signToken, requireAuth, requireApiKey, generateApiKey }
