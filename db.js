// Base de datos JSON — 100% JavaScript puro, sin módulos nativos
// Compatible con Linux, Windows, macOS, Render.com sin errores ELF
const fs   = require("fs")
const path = require("path")

const DB_PATH = path.join(__dirname, "data.json")

function load() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf8")) }
  catch { return { users: [], apiKeys: [], _nextId: { users: 1, apiKeys: 1 } } }
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

// ── Usuarios ───────────────────────────────────────────────────────────────────

function getUserById(id) {
  return load().users.find(u => u.id === id) ?? null
}

function getUserByEmail(email) {
  return load().users.find(u => u.email === email) ?? null
}

function createUser({ username, email, passwordHash }) {
  const db = load()
  const user = {
    id: db._nextId.users++,
    username,
    email,
    password_hash: passwordHash,
    created_at: new Date().toISOString(),
  }
  db.users.push(user)
  save(db)
  return user
}

// ── API Keys ───────────────────────────────────────────────────────────────────

function getApiKeyByKey(key) {
  return load().apiKeys.find(k => k.key === key) ?? null
}

function getApiKeyByUserId(userId) {
  return load().apiKeys.find(k => k.user_id === userId) ?? null
}

function createApiKey(userId, key) {
  const db = load()
  const apiKey = {
    id: db._nextId.apiKeys++,
    user_id: userId,
    key,
    created_at: new Date().toISOString(),
    last_used_at: null,
    usage_count: 0,
  }
  db.apiKeys.push(apiKey)
  save(db)
  return apiKey
}

function updateApiKey(id, fields) {
  const db = load()
  const idx = db.apiKeys.findIndex(k => k.id === id)
  if (idx === -1) return null
  Object.assign(db.apiKeys[idx], fields)
  save(db)
  return db.apiKeys[idx]
}

function replaceApiKey(userId, newKey) {
  const db = load()
  db.apiKeys = db.apiKeys.filter(k => k.user_id !== userId)
  const apiKey = {
    id: db._nextId.apiKeys++,
    user_id: userId,
    key: newKey,
    created_at: new Date().toISOString(),
    last_used_at: null,
    usage_count: 0,
  }
  db.apiKeys.push(apiKey)
  save(db)
  return apiKey
}

module.exports = { getUserById, getUserByEmail, createUser, getApiKeyByKey, getApiKeyByUserId, createApiKey, updateApiKey, replaceApiKey }
