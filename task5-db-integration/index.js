const express = require("express");
const mysql = require("mysql2/promise");
const app = express();
const PORT = 3000;

app.use(express.json());

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "your_mysql_password",
  database: "saiket_internship",
  waitForConnections: true,
  connectionLimit: 10,
});

function validate(body) {
  const err = [];
  if (!body.name || body.name.trim().length < 2)
    err.push("name: must be at least 2 characters");
  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
    err.push("email: must be a valid email address");
  const age = Number(body.age);
  if (!body.age || isNaN(age) || age < 1 || age > 120)
    err.push("age: must be a number between 1 and 120");
  return err;
}

app.get("/", async (req, res) => {
  res.json({
    project: "SaiKet Systems Internship — Task 5",
    description: "REST API connected to MySQL database",
    routes: {
      "GET    /users": "Get all users",
      "GET    /users/:id": "Get single user",
      "POST   /users": "Create user — { name, email, age }",
      "PUT    /users/:id": "Update user — { name, email, age }",
      "DELETE /users/:id": "Delete user",
    },
  });
});

app.get("/users", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users ORDER BY id DESC");
    res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "Database error", error: e.message });
  }
});

app.get("/users/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [
      req.params.id,
    ]);
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, data: rows[0] });
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "Database error", error: e.message });
  }
});

app.post("/users", async (req, res) => {
  const errors = validate(req.body);
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
        .json({ success: false, message: "Email already exists" });
    const [result] = await pool.query(
      "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
      [
        req.body.name.trim(),
        req.body.email.trim().toLowerCase(),
        Number(req.body.age),
      ],
    );
    const [newUser] = await pool.query("SELECT * FROM users WHERE id = ?", [
      result.insertId,
    ]);
    res
      .status(201)
      .json({ success: true, message: "User created", data: newUser[0] });
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "Database error", error: e.message });
  }
});

app.put("/users/:id", async (req, res) => {
  const errors = validate(req.body);
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
        .json({
          success: false,
          message: "Email already used by another user",
        });
    await pool.query(
      "UPDATE users SET name = ?, email = ?, age = ? WHERE id = ?",
      [
        req.body.name.trim(),
        req.body.email.trim().toLowerCase(),
        Number(req.body.age),
        req.params.id,
      ],
    );
    const [updated] = await pool.query("SELECT * FROM users WHERE id = ?", [
      req.params.id,
    ]);
    res
      .status(200)
      .json({ success: true, message: "User updated", data: updated[0] });
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "Database error", error: e.message });
  }
});

app.delete("/users/:id", async (req, res) => {
  try {
    const [exist] = await pool.query("SELECT * FROM users WHERE id = ?", [
      req.params.id,
    ]);
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
      .json({ success: false, message: "Database error", error: e.message });
  }
});

app.use((req, res) => {
  res
    .status(404)
    .json({
      success: false,
      message: "Route " + req.method + " " + req.path + " not found",
    });
});

app.listen(PORT, () => {
  console.log("\n  SaiKet Systems — Task 5 DB Integration");
  console.log("  Running at http://localhost:" + PORT + "\n");
});
