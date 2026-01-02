const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Statik dosyalar için "public" klasörü
app.use(express.static(path.join(__dirname, "public")));

// VERİTABANI BAĞLANTISI
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost") 
       ? { rejectUnauthorized: false } 
       : false
});

// Tabloyu otomatik oluşturma
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
    console.error("❌ DB Hatası (Başlangıç):", err.message);
  }
};
initDB();

// API ROTARI (Ön eki /api yaptık)
app.get("/api/tasks", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tasks ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("GET Hatası:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tasks", async (req, res) => {
  try {
    const { text, status, day } = req.body;
    if (!text || !day) return res.status(400).json({ error: "Eksik veri" });
    
    const result = await pool.query(
      "INSERT INTO tasks (text, status, day) VALUES ($1, $2, $3) RETURNING *",
      [text, status || 'todo', day]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST Hatası:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query("UPDATE tasks SET status = $1 WHERE id = $2", [status, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM tasks WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA Yönlendirmesi (En sonda kalmalı)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sunucu ${PORT} portunda hazır.`);
});
