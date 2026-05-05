const router = require("express").Router()
// bcryptjs = drop-in replacement de bcrypt, 100% JavaScript puro
// Compatible con Linux/Render/Windows sin modulos nativos
const bcrypt = require("bcryptjs")
const db = require("../db")
const { signToken, requireAuth, generateApiKey } = require("../middleware/auth")

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body
  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email y password son requeridos" })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "La password debe tener al menos 6 caracteres" })
  }
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) {
    return res.status(409).json({ error: "El email ya esta registrado" })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const { lastInsertRowid: userId } = db.prepare(
    "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)"
  ).run(username, email, passwordHash)

  const apiKey = generateApiKey()
  db.prepare("INSERT INTO api_keys (user_id, key) VALUES (?, ?)").run(userId, apiKey)

  const user = db.prepare("SELECT id, username, email, created_at FROM users WHERE id = ?").get(userId)
  res.status(201).json({
    token: signToken(userId),
    user: { id: user.id, username: user.username, email: user.email, createdAt: user.created_at },
    apiKey
  })
})

router.post("/login", async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: "email y password son requeridos" })
  }
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email)
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Email o password incorrecto" })
  }
  res.json({
    token: signToken(user.id),
    user: { id: user.id, username: user.username, email: user.email, createdAt: user.created_at }
  })
})

router.get("/me", requireAuth, (req, res) => {
  const { id, username, email, created_at } = req.user
  res.json({ id, username, email, createdAt: created_at })
})

module.exports = router
