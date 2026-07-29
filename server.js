const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { authMiddleware, SECRET } = require('./middleware/auth');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

/* ================= AUTH ROUTES ================= */

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (existing) return res.status(400).json({ message: 'Username already taken' });

  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashed);

  const token = jwt.sign({ id: result.lastInsertRowid, username }, SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, username });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(400).json({ message: 'Invalid username or password' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(400).json({ message: 'Invalid username or password' });

  const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username });
});

/* ================= ITEM ROUTES (Protected) ================= */

app.get('/api/items', authMiddleware, (req, res) => {
  const items = db.prepare('SELECT * FROM items ORDER BY createdAt DESC').all();
  res.json(items);
});

app.post('/api/items', authMiddleware, (req, res) => {
  const { name, category, quantity, price } = req.body;
  if (!name || !category || quantity === undefined || price === undefined) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  const result = db.prepare(
    'INSERT INTO items (name, category, quantity, price) VALUES (?, ?, ?, ?)'
  ).run(name, category, Number(quantity), Number(price));

  const newItem = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newItem);
});

app.put('/api/items/:id', authMiddleware, (req, res) => {
  const { name, category, quantity, price } = req.body;
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Item not found' });

  db.prepare(
    'UPDATE items SET name = ?, category = ?, quantity = ?, price = ? WHERE id = ?'
  ).run(
    name ?? existing.name,
    category ?? existing.category,
    quantity !== undefined ? Number(quantity) : existing.quantity,
    price !== undefined ? Number(price) : existing.price,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  res.json(updated);
});

app.delete('/api/items/:id', authMiddleware, (req, res) => {
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Item not found' });

  db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  res.json({ message: 'Item deleted successfully' });
});

/* ================= ANALYTICS ROUTE ================= */

app.get('/api/analytics', authMiddleware, (req, res) => {
  const items = db.prepare('SELECT * FROM items').all();

  const categoryMap = {};
  items.forEach(i => {
    categoryMap[i.category] = (categoryMap[i.category] || 0) + i.quantity;
  });

  const stockLevels = items.map(i => ({ name: i.name, quantity: i.quantity }));

  res.json({
    categoryDistribution: categoryMap,
    stockLevels,
    totalItems: items.length,
    totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
    totalValue: items.reduce((s, i) => s + i.quantity * i.price, 0)
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Inventory backend (SQLite + Auth) running at http://localhost:${PORT}`);
});