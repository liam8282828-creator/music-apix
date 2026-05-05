const router = require("express").Router()
const db = require("../db")
const { requireAuth, generateApiKey } = require("../middleware/auth")

router.get("/", requireAuth, (req, res) => {
  const apiKey = db.prepare("SELECT * FROM api_keys WHERE user_id = ?").get(req.user.id)
  if (!apiKey) return res.status(404).json({ error: "No se encontro API Key" })
  res.json({
    key: apiKey.key,
    createdAt: apiKey.created_at,
    lastUsedAt: apiKey.last_used_at || null,
    usageCount: apiKey.usage_count
  })
})

router.post("/regenerate", requireAuth, (req, res) => {
  const newKey = generateApiKey()
  const existing = db.prepare("SELECT id FROM api_keys WHERE user_id = ?").get(req.user.id)
  if (existing) {
    db.prepare(
      "UPDATE api_keys SET key = ?, created_at = datetime('now'), last_used_at = NULL, usage_count = 0 WHERE user_id = ?"
    ).run(newKey, req.user.id)
  } else {
    db.prepare("INSERT INTO api_keys (user_id, key) VALUES (?, ?)").run(req.user.id, newKey)
  }
  const apiKey = db.prepare("SELECT * FROM api_keys WHERE user_id = ?").get(req.user.id)
  res.json({
    key: apiKey.key,
    createdAt: apiKey.created_at,
    lastUsedAt: apiKey.last_used_at || null,
    usageCount: apiKey.usage_count
  })
})

module.exports = router
