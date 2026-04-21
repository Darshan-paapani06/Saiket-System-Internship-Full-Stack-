const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 5000;
const SECRET = "saiket_jwt_secret_2025";

app.use(cors({ origin: "http://localhost:5500", credentials: true }));
app.use(express.json());

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "your_mysql_password",
  database: "saiket_fullstack",
  waitForConnections: true,
  connectionLimit: 10,
});

function authCheck(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer "))
    return res
      .status(401)
      .json({ success: false, message: "No token — please login" });
  try {
    req.user = jwt.verify(header.split(" ")[1], SECRET);
    next();
  } catch (e) {
    res
      .status(401)
      .json({ success: false, message: "Token invalid or expired" });
  }
}

function validateUser(body, skipPassword) {
  const err = [];
  if (!body.name || body.name.trim().length < 2)
    err.push("name: minimum 2 characters required");
  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
    err.push("email: must be a valid email address");
  const age = Number(body.age);
  if (!body.age || isNaN(age) || age < 1 || age > 120)
    err.push("age: must be between 1 and 120");
  if (!skipPassword && (!body.password || body.password.length < 6))
    err.push("password: minimum 6 characters required");
  return err;
}

app.post("/api/auth/register", async (req, res) => {
  const errors = validateUser(req.body, false);
  if (errors.length)
    return res
      .status(400)
      .json({ success: false, message: "Validation failed", errors });
  try {
    const [dup] = await pool.query("SELECT id FROM users WHERE email = ?", [
      req.body.email,
    ]);
    if (dup.length)
      return res
        .status(409)
        .json({ success: false, message: "Email already registered" });
    const hash = await bcrypt.hash(req.body.password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, age, password) VALUES (?, ?, ?, ?)",
      [
        req.body.name.trim(),
        req.body.email.trim().toLowerCase(),
        Number(req.body.age),
        hash,
      ],
    );
    const [user] = await pool.query(
      "SELECT id, name, email, age, created_at FROM users WHERE id = ?",
      [result.insertId],
    );
    const token = jwt.sign({ id: user[0].id, email: user[0].email }, SECRET, {
      expiresIn: "7d",
    });
    res
      .status(201)
      .json({
        success: true,
        message: "Registered successfully",
        token,
        data: user[0],
      });
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: e.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  if (!req.body.email || !req.body.password)
    return res
      .status(400)
      .json({ success: false, message: "Email and password are required" });
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      req.body.email.trim().toLowerCase(),
    ]);
    if (!rows.length)
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    const ok = await bcrypt.compare(req.body.password, rows[0].password);
    if (!ok)
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    const token = jwt.sign({ id: rows[0].id, email: rows[0].email }, SECRET, {
      expiresIn: "7d",
    });
    const { password, ...safeUser } = rows[0];
    res
      .status(200)
      .json({
        success: true,
        message: "Login successful",
        token,
        data: safeUser,
      });
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: e.message });
  }
});

app.get("/api/users", authCheck, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, age, created_at FROM users ORDER BY id DESC",
    );
    res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: e.message });
  }
});

app.get("/api/users/:id", authCheck, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, age, created_at FROM users WHERE id = ?",
      [req.params.id],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, data: rows[0] });
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: e.message });
  }
});

app.put("/api/users/:id", authCheck, async (req, res) => {
  const errors = validateUser(req.body, true);
  if (errors.length)
    return res
      .status(400)
      .json({ success: false, message: "Validation failed", errors });
  try {
    const [exist] = await pool.query("SELECT id FROM users WHERE id = ?", [
      req.params.id,
    ]);
    if (!exist.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    const [dup] = await pool.query(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [req.body.email, req.params.id],
    );
    if (dup.length)
      return res
        .status(409)
        .json({ success: false, message: "Email already used" });
    await pool.query(
      "UPDATE users SET name = ?, email = ?, age = ? WHERE id = ?",
      [
        req.body.name.trim(),
        req.body.email.trim().toLowerCase(),
        Number(req.body.age),
        req.params.id,
      ],
    );
    const [updated] = await pool.query(
      "SELECT id, name, email, age, created_at FROM users WHERE id = ?",
      [req.params.id],
    );
    res
      .status(200)
      .json({ success: true, message: "User updated", data: updated[0] });
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: e.message });
  }
});

app.delete("/api/users/:id", authCheck, async (req, res) => {
  try {
    const [exist] = await pool.query(
      "SELECT id, name, email FROM users WHERE id = ?",
      [req.params.id],
    );
    if (!exist.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    await pool.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    res
      .status(200)
      .json({ success: true, message: "User deleted", data: exist[0] });
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: e.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.listen(PORT, () => {
  console.log("\n  SaiKet Systems — Task 6 Backend");
  console.log("  API running at http://localhost:" + PORT + "/api\n");
});
