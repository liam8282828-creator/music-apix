const router = require("express").Router()
const db = require("../db")
const { requireAuth, generateApiKey } = require("../middleware/auth")

router.get("/", requireAuth, (req, res) => {
  const apiKey = db.getApiKeyByUserId(req.user.id)
  if (!apiKey) return res.status(404).json({ error: "No se encontro API Key" })
  res.json({
    key: apiKey.key,
    createdAt: apiKey.created_at,
    lastUsedAt: apiKey.last_used_at,
    usageCount: apiKey.usage_count,
  })
})

router.post("/regenerate", requireAuth, (req, res) => {
  const apiKey = db.replaceApiKey(req.user.id, generateApiKey())
  res.json({
    key: apiKey.key,
    createdAt: apiKey.created_at,
    lastUsedAt: apiKey.last_used_at,
    usageCount: apiKey.usage_count,
  })
})

module.exports = router
