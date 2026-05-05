const API = ""
let currentUser = null
let apiKeyValue = ""
let keyVisible  = false

function toggleTheme() { document.body.classList.toggle("light") }

function showPage(page) {
  document.getElementById("page-login").style.display    = "none"
  document.getElementById("page-register").style.display = "none"
  document.getElementById("page-dashboard").style.display = "none"
  if (page === "login" || page === "register") {
    document.getElementById("page-" + page).style.display = "flex"
  }
}

function navTo(section, el) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"))
  document.getElementById("section-" + section).classList.add("active")
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"))
  el.classList.add("active")
  if (section === "dashboard") loadStats()
  if (section === "apikeys")   loadApiKey()
  if (section === "settings")  loadSettings()
}

function authHeaders() {
  return { Authorization: "Bearer " + localStorage.getItem("musicbot_token") }
}

async function doLogin() {
  const email    = document.getElementById("login-email").value.trim()
  const password = document.getElementById("login-password").value
  const errEl    = document.getElementById("login-error")
  errEl.style.display = "none"
  try {
    const res  = await fetch(API + "/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) { errEl.textContent = data.error; errEl.style.display = "block"; return }
    localStorage.setItem("musicbot_token", data.token)
    currentUser = data.user
    document.getElementById("page-login").style.display    = "none"
    document.getElementById("page-dashboard").style.display = "flex"
    loadStats(); loadApiKey()
  } catch { errEl.textContent = "Error de conexión con el servidor"; errEl.style.display = "block" }
}

async function doRegister() {
  const username = document.getElementById("reg-username").value.trim()
  const email    = document.getElementById("reg-email").value.trim()
  const password = document.getElementById("reg-password").value
  const errEl    = document.getElementById("register-error")
  errEl.style.display = "none"
  try {
    const res  = await fetch(API + "/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    })
    const data = await res.json()
    if (!res.ok) { errEl.textContent = data.error; errEl.style.display = "block"; return }
    localStorage.setItem("musicbot_token", data.token)
    currentUser = data.user
    document.getElementById("page-register").style.display  = "none"
    document.getElementById("page-dashboard").style.display = "flex"
    loadStats(); loadApiKey()
  } catch { errEl.textContent = "Error de conexión"; errEl.style.display = "block" }
}

function doLogout() {
  localStorage.removeItem("musicbot_token")
  currentUser = null
  document.getElementById("page-dashboard").style.display = "none"
  document.getElementById("page-login").style.display     = "flex"
}

async function loadStats() {
  if (!currentUser) {
    const r = await fetch(API + "/api/auth/me", { headers: authHeaders() })
    if (!r.ok) return
    currentUser = await r.json()
  }
  document.getElementById("dash-welcome").textContent = "Hola, " + currentUser.username
  document.getElementById("stat-since").textContent   =
    new Date(currentUser.createdAt || currentUser.created_at).toLocaleDateString("es-ES")
  try {
    const data = await fetch(API + "/api/stats/me", { headers: authHeaders() }).then(r => r.json())
    document.getElementById("stat-total").textContent      = data.totalRequests
    document.getElementById("stat-key-status").textContent = data.apiKeyActive ? "Activa" : "Inactiva"
  } catch {}
}

async function loadApiKey() {
  try {
    const res  = await fetch(API + "/api/keys", { headers: authHeaders() })
    const data = await res.json()
    if (!res.ok) return
    apiKeyValue = data.key
    document.getElementById("api-key-input").value = data.key
    document.getElementById("api-key-input").type  = "password"
    keyVisible = false
    document.getElementById("key-uses").textContent    = data.usageCount
    document.getElementById("key-created").textContent = new Date(data.createdAt).toLocaleDateString("es-ES")
    document.getElementById("key-last").textContent    = data.lastUsedAt
      ? new Date(data.lastUsedAt).toLocaleDateString("es-ES") : "Nunca"
  } catch {}
}

function toggleKeyVisibility() {
  keyVisible = !keyVisible
  document.getElementById("api-key-input").type = keyVisible ? "text" : "password"
}

function copyApiKey() {
  navigator.clipboard.writeText(apiKeyValue).then(() => {
    const fb = document.getElementById("copy-feedback")
    fb.style.display = "block"
    setTimeout(() => fb.style.display = "none", 2000)
  })
}

function confirmRegen() { document.getElementById("modal-overlay").style.display = "flex" }
function closeModal()   { document.getElementById("modal-overlay").style.display = "none"  }

async function doRegen() {
  closeModal()
  try {
    const data = await fetch(API + "/api/keys/regenerate", {
      method: "POST", headers: authHeaders(),
    }).then(r => r.json())
    apiKeyValue = data.key
    document.getElementById("api-key-input").value = data.key
    document.getElementById("api-key-input").type  = "password"
    keyVisible = false
    document.getElementById("key-uses").textContent    = data.usageCount
    document.getElementById("key-created").textContent = new Date(data.createdAt).toLocaleDateString("es-ES")
    document.getElementById("key-last").textContent    = "Nunca"
  } catch {}
}

async function searchMusic() {
  const q         = document.getElementById("music-query").value.trim()
  const container = document.getElementById("music-results")
  if (!q) return
  container.innerHTML = '<div class="music-empty">Buscando...</div>'
  try {
    const results = await fetch(
      API + "/api/music/search?q=" + encodeURIComponent(q),
      { headers: authHeaders() }
    ).then(r => r.json())
    if (!Array.isArray(results) || !results.length) {
      container.innerHTML = '<div class="music-empty">No se encontraron resultados.</div>'
      return
    }
    container.innerHTML = results.map(r => `
      <div class="music-card">
        <img class="music-thumb" src="${r.thumbnail}" alt="" onerror="this.style.display='none'" />
        <div class="music-info">
          <div class="music-title" title="${r.title}">${r.title}</div>
          <div class="music-meta"><span>${r.author}</span><span>${r.duration}</span></div>
          <a class="music-link" href="${r.url}" target="_blank">${r.url}</a>
        </div>
      </div>`).join("")
  } catch { container.innerHTML = '<div class="music-empty">Error al buscar.</div>' }
}

function loadSettings() {
  if (!currentUser) return
  document.getElementById("set-username").textContent = currentUser.username
  document.getElementById("set-email").textContent    = currentUser.email
  document.getElementById("set-since").textContent    =
    new Date(currentUser.createdAt || currentUser.created_at).toLocaleDateString("es-ES")
}

;(async function init() {
  const token = localStorage.getItem("musicbot_token")
  if (!token) { document.getElementById("page-login").style.display = "flex"; return }
  const res = await fetch(API + "/api/auth/me", { headers: { Authorization: "Bearer " + token } })
  if (!res.ok) {
    localStorage.removeItem("musicbot_token")
    document.getElementById("page-login").style.display = "flex"
    return
  }
  currentUser = await res.json()
  document.getElementById("page-dashboard").style.display = "flex"
  loadStats(); loadApiKey()
})()
