const express = require("express");
const app = express();
const PORT = 3000;

app.use(express.json());

let users = [
  { id: 1, name: "Alex Rivera", email: "alex@example.com", age: 22 },
  { id: 2, name: "Priya Sharma", email: "priya@example.com", age: 25 },
  { id: 3, name: "James Lee", email: "james@example.com", age: 28 },
];
let nextId = 4;

function validate(body) {
  const err = [];
  if (
    !body.name ||
    typeof body.name !== "string" ||
    body.name.trim().length < 2
  )
    err.push("name: must be a string with at least 2 characters");
  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
    err.push("email: must be a valid email address");
  if (
    body.age === undefined ||
    typeof body.age !== "number" ||
    body.age < 1 ||
    body.age > 120
  )
    err.push("age: must be a number between 1 and 120");
  return err;
}

app.get("/", (req, res) => {
  res.json({
    project: "SaiKet Systems Internship — Task 4",
    description: "Basic REST API for User entity",
    routes: {
      "GET    /users": "Get all users",
      "GET    /users/:id": "Get single user by ID",
      "POST   /users": "Create user — body: { name, email, age }",
      "PUT    /users/:id": "Update user — body: { name, email, age }",
      "DELETE /users/:id": "Delete user by ID",
    },
  });
});

app.get("/users", (req, res) => {
  res.status(200).json({ success: true, count: users.length, data: users });
});

app.get("/users/:id", (req, res) => {
  const user = users.find((u) => u.id === Number(req.params.id));
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });
  res.status(200).json({ success: true, data: user });
});

app.post("/users", (req, res) => {
  const errors = validate(req.body);
  if (errors.length)
    return res
      .status(400)
      .json({ success: false, message: "Validation failed", errors });
  if (users.find((u) => u.email === req.body.email))
    return res
      .status(409)
      .json({ success: false, message: "Email already exists" });
  const user = {
    id: nextId++,
    name: req.body.name.trim(),
    email: req.body.email.trim().toLowerCase(),
    age: req.body.age,
  };
  users.push(user);
  res
    .status(201)
    .json({ success: true, message: "User created successfully", data: user });
});

app.put("/users/:id", (req, res) => {
  const idx = users.findIndex((u) => u.id === Number(req.params.id));
  if (idx === -1)
    return res.status(404).json({ success: false, message: "User not found" });
  const errors = validate(req.body);
  if (errors.length)
    return res
      .status(400)
      .json({ success: false, message: "Validation failed", errors });
  if (users.find((u) => u.email === req.body.email && u.id !== users[idx].id))
    return res
      .status(409)
      .json({ success: false, message: "Email already used by another user" });
  users[idx] = {
    ...users[idx],
    name: req.body.name.trim(),
    email: req.body.email.trim().toLowerCase(),
    age: req.body.age,
  };
  res
    .status(200)
    .json({
      success: true,
      message: "User updated successfully",
      data: users[idx],
    });
});

app.delete("/users/:id", (req, res) => {
  const idx = users.findIndex((u) => u.id === Number(req.params.id));
  if (idx === -1)
    return res.status(404).json({ success: false, message: "User not found" });
  const deleted = users.splice(idx, 1)[0];
  res
    .status(200)
    .json({
      success: true,
      message: "User deleted successfully",
      data: deleted,
    });
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
  console.log("\n  SaiKet Systems — Task 4 REST API");
  console.log("  Running at http://localhost:" + PORT + "\n");
});
