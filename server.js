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

// VERİTABANI BAĞLANTISI
const pool = new Pool({
  // Coolify'daki DATABASE_URL değişkenini kullanır
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // Cloud sunucularda (Coolify/Render/Railway) bu ayar zorunludur
    rejectUnauthorized: false 
  }
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
    console.error("❌ DB Hatası (Tablo oluşturulamadı):", err.message);
  }
};
initDB();

// GÖREVLERİ GETİR (GET)
app.get("/tasks", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tasks ORDER BY id DESC");
    // Frontend'e direkt diziyi (array) gönderiyoruz
    res.json(result.rows || []); 
  } catch (err) {
    console.error("GET Hatası:", err.message);
    res.status(500).json([]); // Hata olsa bile boş dizi dön ki frontend çökmesin
  }
});

// YENİ GÖREV EKLE (POST)
app.post("/tasks", async (req, res) => {
  try {
    const { text, status, day } = req.body;
    const result = await pool.query(
      "INSERT INTO tasks (text, status, day) VALUES ($1, $2, $3) RETURNING *",
      [text, status, day]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST Hatası:", err.message);
    res.status(500).json({ error: "Ekleme yapılamadı" });
  }
});

// GÖREV GÜNCELLE (PUT)
app.put("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query("UPDATE tasks SET status = $1 WHERE id = $2", [status, id]);
    res.json({ success: true });
  } catch (err) {
    console.error("PUT Hatası:", err.message);
    res.status(500).json({ error: "Güncellenemedi" });
  }
});

// GÖREV SİL (DELETE)
app.delete("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM tasks WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE Hatası:", err.message);
    res.status(500).json({ error: "Silinemedi" });
  }
});

// Tüm route'ların dışındaki istekleri ana sayfaya yönlendir (SPA yapısı için)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sunucu ${PORT} portunda başarıyla başlatıldı`);
});
