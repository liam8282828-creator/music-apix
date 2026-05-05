const jwt = require("jsonwebtoken")
const db = require("../db")

const JWT_SECRET = process.env.SESSION_SECRET || "musicbot-secret-cambia-en-produccion"

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" })
}

function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET) } catch { return null }
}

function extractBearer(req) {
  // Soporta cabeceras en cualquier capitalización
  const header = req.headers["authorization"] || req.headers["Authorization"] || ""
  if (!header.toLowerCase().startsWith("bearer ")) return null
  return header.split(" ")[1]?.trim() || null
}

function requireAuth(req, res, next) {
  const token = extractBearer(req)
  if (!token) {
    return res.status(401).json({
      error: "Token JWT requerido",
      uso: "Authorization: Bearer TU_TOKEN_JWT"
    })
  }
  const payload = verifyToken(token)
  if (!payload) {
    return res.status(401).json({ error: "Token invalido o expirado. Inicia sesion de nuevo." })
  }
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.userId)
  if (!user) return res.status(401).json({ error: "Usuario no encontrado" })
  req.user = user
  next()
}

function requireApiKey(req, res, next) {
  const key = extractBearer(req)
  if (!key) {
    return res.status(401).json({
      error: "API Key requerida",
      uso: "Authorization: Bearer TU_API_KEY"
    })
  }
  const apiKey = db.prepare("SELECT * FROM api_keys WHERE key = ?").get(key)
  if (!apiKey) {
    return res.status(401).json({
      error: "API Key invalida. Obtenla en el panel web.",
      hint: "La key empieza con 'mbk_'"
    })
  }
  db.prepare("UPDATE api_keys SET last_used_at = ?, usage_count = usage_count + 1 WHERE id = ?")
    .run(new Date().toISOString(), apiKey.id)
  req.apiKey = apiKey
  next()
}

function generateApiKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let key = "mbk_"
  for (let i = 0; i < 32; i++) key += chars.charAt(Math.floor(Math.random() * chars.length))
  return key
}

module.exports = { signToken, requireAuth, requireApiKey, generateApiKey }
