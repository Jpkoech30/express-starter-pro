const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { DataTypes } = require('sequelize');
const { createApp } = require('../../index');

async function main() {
  const { app, ready, sequelize } = await createApp({
    port: 3000,
    sessionSecret: 'my-secret-key-change-in-production',
    database: { dialect: 'sqlite', storage: ':memory:', sync: { force: true } },
  });

  const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING },
  });

  app.post('/register', async (req, res) => {
    try {
      const hashed = await bcrypt.hash(req.body.password, 10);
      const user = await User.create({ email: req.body.email, password: hashed, name: req.body.name });
      res.status(201).json({ id: user.id, email: user.email, name: user.name });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/login', async (req, res) => {
    try {
      const user = await User.findOne({ where: { email: req.body.email } });
      if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = jwt.sign({ id: user.id, email: user.email }, 'my-secret-key-change-in-production', { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/profile', async (req, res) => {
    try {
      const auth = req.headers.authorization?.replace('Bearer ', '');
      if (!auth) return res.status(401).json({ error: 'No token' });
      const decoded = jwt.verify(auth, 'my-secret-key-change-in-production');
      const user = await User.findByPk(decoded.id);
      res.json({ id: user.id, email: user.email, name: user.name });
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  await ready;
  app.listen(3000, () => console.log('Auth example running on port 3000'));
}

main().catch(console.error);
