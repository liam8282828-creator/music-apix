const express = require("express")
const path = require("path")
const cors = require("cors")
const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())
app.use(express.static(path.join(__dirname, "public")))

app.use("/api/auth",  require("./routes/auth"))
app.use("/api/keys",  require("./routes/keys"))
app.use("/api/music", require("./routes/music"))
app.use("/api/stats", require("./routes/stats"))

app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok", version: "2.0.0", db: "json", nativeModules: false })
})

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log("==============================================")
  console.log("  MusicBot API en http://localhost:" + PORT)
  console.log("  DB : JSON puro (sin modulos nativos)")
  console.log("  Compatible: Render / Linux / Windows / Mac")
  console.log("==============================================")
})
