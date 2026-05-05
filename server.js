const express = require("express")
const path = require("path")
const cors = require("cors")
const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())
app.use(express.static(path.join(__dirname, "public")))

app.use("/api/auth", require("./routes/auth"))
app.use("/api/keys", require("./routes/keys"))
app.use("/api/music", require("./routes/music"))
app.use("/api/stats", require("./routes/stats"))

app.get("/api/healthz", (req, res) => {
  res.json({ status: "ok", port: process.env.PORT || 3000 })
})

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log("==============================================")
  console.log("  MusicBot API en http://localhost:" + PORT)
  console.log("  Panel web: http://localhost:" + PORT)
  console.log("  Registrate para obtener tu API Key")
  console.log("==============================================")
})
