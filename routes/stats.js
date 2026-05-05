const router = require("express").Router()
const db = require("../db")
const { requireAuth } = require("../middleware/auth")

router.get("/me", requireAuth, (req, res) => {
  const apiKey = db.getApiKeyByUserId(req.user.id)
  res.json({
    totalRequests: apiKey?.usage_count ?? 0,
    requestsToday: 0,
    memberSince:   req.user.created_at,
    apiKeyActive:  !!apiKey,
  })
})

module.exports = router
