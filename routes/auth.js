const router = require("express").Router()
// bcryptjs = 100% JavaScript puro — sin módulos nativos, funciona en Linux/Render/Windows
const bcrypt = require("bcryptjs")
const db     = require("../db")
const { signToken, requireAuth, generateApiKey } = require("../middleware/auth")

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body
  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email y password son requeridos" })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "La password debe tener al menos 6 caracteres" })
  }
  if (db.getUserByEmail(email)) {
    return res.status(409).json({ error: "El email ya esta registrado" })
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const user   = db.createUser({ username, email, passwordHash })
  const apiKey = db.createApiKey(user.id, generateApiKey())
  res.status(201).json({
    token: signToken(user.id),
    user: { id: user.id, username: user.username, email: user.email, createdAt: user.created_at },
    apiKey: apiKey.key,
  })
})

router.post("/login", async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: "email y password son requeridos" })
  }
  const user = db.getUserByEmail(email)
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Email o password incorrecto" })
  }
  res.json({
    token: signToken(user.id),
    user: { id: user.id, username: user.username, email: user.email, createdAt: user.created_at },
  })
})

router.get("/me", requireAuth, (req, res) => {
  const { id, username, email, created_at } = req.user
  res.json({ id, username, email, createdAt: created_at })
})

module.exports = router
