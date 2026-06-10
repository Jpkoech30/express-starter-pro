# Examples

## Basic Server

```javascript
const { createApp } = require('express-starter-kit');

async function main() {
  const { app, ready } = await createApp({
    port: 3000,
    database: { dialect: 'sqlite', storage: './data.db' },
  });

  await ready;
  app.listen(3000, () => console.log('Server running on port 3000'));
}

main().catch(console.error);
```

## JWT Authentication

```javascript
const { createApp } = require('express-starter-kit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

async function main() {
  const { app, ready, sequelize } = await createApp({
    port: 3000,
    sessionSecret: process.env.SESSION_SECRET,
    database: { url: process.env.DATABASE_URL, sync: { alter: true } },
  });

  const { DataTypes } = require('sequelize');
  const User = sequelize.define('User', {
    email: { type: DataTypes.STRING, unique: true },
    password: DataTypes.STRING,
  });

  app.post('/register', async (req, res) => {
    const hashed = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({ email: req.body.email, password: hashed });
    res.json({ id: user.id, email: user.email });
  });

  app.post('/login', async (req, res) => {
    const user = await User.findOne({ where: { email: req.body.email } });
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id }, process.env.SESSION_SECRET, { expiresIn: '7d' });
    res.json({ token });
  });

  await ready;
  app.listen(3000);
}

main().catch(console.error);
```

## File Upload with Multer

```javascript
const { createApp } = require('express-starter-kit');
const multer = require('multer');
const path = require('path');

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

async function main() {
  const { app, ready } = await createApp({ port: 3000 });

  app.post('/upload', upload.single('file'), (req, res) => {
    res.json({ message: 'File uploaded', file: req.file.filename });
  });

  await ready;
  app.listen(3000);
}

main().catch(console.error);
```

## WebSocket (Socket.io)

```javascript
const { createApp } = require('express-starter-kit');
const { Server } = require('socket.io');
const http = require('http');

async function main() {
  const { app, ready } = await createApp({ port: 3000 });
  const server = http.createServer(app);
  const io = new Server(server);

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('message', (data) => io.emit('message', data));
    socket.on('disconnect', () => console.log('Client disconnected'));
  });

  await ready;
  server.listen(3000);
}

main().catch(console.error);
```

## Redis Caching

```javascript
const { createApp } = require('express-starter-kit');

async function main() {
  const { app, ready } = await createApp({
    port: 3000,
    redis: { url: process.env.REDIS_URL, enabled: true },
    cache: { ttl: 120, enabled: true },
  });

  await ready;
  app.listen(3000);
}

main().catch(console.error);
```

## Database Transactions

```javascript
const { createApp } = require('express-starter-kit');

async function main() {
  const { app, ready, sequelize } = await createApp({
    port: 3000,
    database: { url: process.env.DATABASE_URL, sync: { alter: true } },
    transactionMiddleware: true,
  });

  app.post('/transfer', async (req, res) => {
    const { fromId, toId, amount } = req.body;
    const Account = sequelize.models.Account;

    const from = await Account.findByPk(fromId, { transaction: req.transaction });
    const to = await Account.findByPk(toId, { transaction: req.transaction });

    from.balance -= amount;
    to.balance += amount;

    await from.save({ transaction: req.transaction });
    await to.save({ transaction: req.transaction });

    res.json({ success: true });
  });

  await ready;
  app.listen(3000);
}

main().catch(console.error);
```
