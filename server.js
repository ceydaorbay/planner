const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Statik dosyalar (HTML, CSS, JS) için "public" klasörünü kullanır
app.use(express.static(path.join(__dirname, "public")));

// BURASI GÜNCELLENEN KRİTİK KISIM:
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        status TEXT DEFAULT 'todo',
        day TEXT NOT NULL
      );
    `);
    console.log("✅ Veritabanı ve Tablo Hazır.");
  } catch (err) {
    console.error("❌ DB Hatası:", err);
  }
};
initDB();

app.get("/tasks", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tasks ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/tasks", async (req, res) => {
  try {
    const { text, status, day } = req.body;
    const result = await pool.query(
      "INSERT INTO tasks (text, status, day) VALUES ($1, $2, $3) RETURNING *",
      [text, status, day]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query("UPDATE tasks SET status = $1 WHERE id = $2", [status, id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM tasks WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
});