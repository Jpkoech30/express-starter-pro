<div align="center">
  <h1>🚀 express-starter-pro</h1>
  <p><strong>Production-ready Express.js application starter kit</strong></p>
  <p>Sequelize · Prometheus metrics · Structured logging · CLI scaffolding</p>

  <p>
    <a href="https://www.npmjs.com/package/express-starter-pro">
      <img src="https://img.shields.io/npm/v/express-starter-pro?style=for-the-badge&logo=npm&color=cb3837" alt="npm version">
    </a>
    <a href="https://github.com/Jpkoech30/express-starter-pro/actions/workflows/ci.yml">
      <img src="https://img.shields.io/github/actions/workflow/status/Jpkoech30/express-starter-pro/ci.yml?style=for-the-badge&logo=github&label=CI" alt="CI">
    </a>
    <a href="https://codecov.io/gh/Jpkoech30/express-starter-pro">
      <img src="https://img.shields.io/codecov/c/github/Jpkoech30/express-starter-pro?style=for-the-badge&logo=codecov" alt="Coverage">
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/github/license/Jpkoech30/express-starter-pro?style=for-the-badge&color=blue" alt="License">
    </a>
  </p>
</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

**🛡️ Security First**
- Helmet security headers
- CORS configuration
- CSRF protection
- XSS sanitization
- HPP protection
- Rate limiting

</td>
<td width="50%">

**📊 Observability**
- Prometheus metrics (`/metrics`)
- Structured JSON logging
- Request ID tracing
- Health checks (`/health`, `/ready`)
- Morgan HTTP logging

</td>
</tr>
<tr>
<td width="50%">

**🗄️ Database**
- Sequelize ORM integration
- Connection pooling
- Retry with exponential backoff
- Auto model loading
- Per-request transactions

</td>
<td width="50%">

**🔧 Developer Experience**
- Zod-validated configuration
- Graceful shutdown
- Response caching with ETag
- CLI project scaffolding
- TypeScript definitions

</td>
</tr>
</table>

---

## 📦 Installation

```bash
npm install express-starter-pro
```

## 🚀 Quick Start

```javascript
const { createApp } = require('express-starter-pro');

async function main() {
  const { app, ready } = await createApp({
    port: 3000,
    database: { dialect: 'sqlite', storage: './data.db' },
  });

  await ready;
  app.listen(3000, () => console.log('🚀 Server running on port 3000'));
}

main().catch(console.error);
```

---

## ⚙️ Configuration

### Server Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `3000` | Server port |
| `nodeEnv` | `string` | `'development'` | Environment |
| `timeout` | `boolean\|number` | `30000` | Request timeout (ms) |
| `shutdownTimeout` | `number` | `30000` | Graceful shutdown timeout |

### Middleware Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `helmet` | `boolean\|object` | `true` | Security headers |
| `cors` | `boolean\|object` | `true` | Cross-origin requests |
| `compression` | `boolean\|object` | `{ level: 6 }` | Response compression |
| `morgan` | `boolean\|string` | `'dev'` | HTTP request logging |
| `cookieParser` | `boolean\|string` | `true` | Cookie parsing |
| `rateLimit` | `boolean\|object` | `{ windowMs: 900000, max: 100 }` | Rate limiting |
| `session` | `boolean` | `false` | Session support |
| `csrf` | `boolean` | `false` | CSRF protection |
| `requestId` | `boolean` | `true` | X-Request-Id header |
| `cache` | `boolean\|object` | `{ ttl: 60, enabled: false }` | Response caching |
| `xssClean` | `boolean` | `true` | XSS sanitization |
| `hpp` | `boolean` | `true` | HTTP parameter pollution protection |

### Database Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `database.url` | `string\|null` | `null` | Database URL |
| `database.dialect` | `string` | `'sqlite'` | Database dialect |
| `database.storage` | `string` | `':memory:'` | SQLite storage path |
| `database.pool.max` | `number` | `10` | Max pool size |
| `database.pool.min` | `number` | `0` | Min pool size |
| `database.retry.max` | `number` | `3` | Connection retry count |
| `database.sync` | `boolean\|object` | `false` | Auto-sync models |

---

## 📖 API Reference

### `createApp(config?)`

Returns `Promise<{ app, ready, shutdown, sequelize, metrics }>`

| Property | Type | Description |
|----------|------|-------------|
| `app` | `Express` | Configured Express application |
| `ready` | `Promise<void>` | Resolves when DB is connected |
| `shutdown` | `Function` | Gracefully shut down server |
| `sequelize` | `Sequelize` | Sequelize instance |
| `metrics` | `Object` | Prometheus metrics registry |

### Built-in Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | `{ status: 'ok', uptime, timestamp }` |
| `/ready` | GET | `{ status: 'ready' }` or 503 |
| `/metrics` | GET | Prometheus metrics (text/plain) |

---

## 🛠️ CLI Usage

```bash
npx express-starter-pro init <projectName> [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--template` | Template: `basic`, `auth`, `websocket`, `full` | `basic` |
| `--db` | Database: `postgres`, `mysql`, `sqlite` | `postgres` |
| `--redis` | Include Redis support | `false` |
| `--force` | Overwrite existing directory | `false` |

### Examples

```bash
# Basic project
npx express-starter-pro init my-app

# Auth template with MySQL
npx express-starter-pro init my-app --template auth --db mysql

# Full stack with Redis
npx express-starter-pro init my-app --template full --redis
```

---

## 🌱 Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port |
| `DATABASE_URL` | Database connection string |
| `SESSION_SECRET` | Session secret |
| `REDIS_URL` | Redis connection string |
| `NODE_ENV` | Environment (`development`/`production`) |
| `LOG_LEVEL` | Log level (`error`/`warn`/`info`/`debug`) |

---

## 📁 Sequelize Model Example

```javascript
// models/User.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id:       { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email:    { type: DataTypes.STRING, allowNull: false, unique: true },
    name:     { type: DataTypes.STRING, allowNull: false },
  });

  User.associate = (models) => {
    User.hasMany(models.Post);
  };

  return User;
};
```

---

## 🐳 Production Deployment

<details>
<summary><strong>Docker</strong></summary>

```bash
docker build -t my-app .
docker run -p 3000:3000 my-app
```
</details>

<details>
<summary><strong>Docker Compose</strong></summary>

```bash
docker-compose up
```
</details>

<details>
<summary><strong>PM2</strong></summary>

```bash
npm install -g pm2
pm2 start index.js --name my-app
```
</details>

<details>
<summary><strong>Kubernetes</strong></summary>

```bash
kubectl apply -f k8s/deployment.yaml
```
</details>

---

## 🔄 Migration Guide

| Step | From Vanilla Express | To express-starter-pro |
|------|---------------------|----------------------|
| 1 | `npm install express` | `npm install express-starter-pro` |
| 2 | `const app = express()` | `const { app, ready } = await createApp(config)` |
| 3 | Manual helmet/cors/morgan setup | Auto-configured via `config` |
| 4 | `app.listen(3000)` | `await ready; app.listen(3000)` |
| 5 | `console.log` | `req.log.info(...)` |
| 6 | Manual error handling | Built-in error handler |

---

## ❓ Troubleshooting

| Issue | Solution |
|-------|----------|
| Database connection fails | Check `DATABASE_URL`, ensure DB is running |
| Session not working | Set `SESSION_SECRET` and enable `session: true` |
| Rate limiting too strict | Adjust `rateLimit.windowMs` and `rateLimit.max` |
| CSRF errors on POST | Include `X-CSRF-Token` header from cookie |
| Metrics not showing | Hit `/metrics` endpoint after some requests |

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

[MIT](LICENSE) © Jpkoech30
