<div align="center">
  <h1>🚀 express-starter-pro</h1>
  <p><strong>Production-ready Express.js application starter kit</strong></p>
  <p>Sequelize · Prometheus metrics · Structured logging · CLI scaffolding · Redis · Swagger</p>

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
- CSRF protection with replay prevention
- XSS sanitization
- HPP protection
- Rate limiting (memory or Redis-backed)

</td>
<td width="50%">

**📊 Observability**
- Prometheus metrics (`/metrics`)
- Structured JSON logging
- Request ID tracing
- Health checks (`/health`, `/ready`) — customizable paths
- Morgan HTTP logging

</td>
</tr>
<tr>
<td width="50%">

**🗄️ Database & Cache**
- Sequelize ORM integration
- Connection pooling with retry logic
- Auto model loading
- Per-request transactions
- Response caching (LRU + optional Redis)
- Redis session store, rate-limit store, CSRF tracking

</td>
<td width="50%">

**🔧 Developer Experience**
- Zod-validated configuration
- Graceful shutdown with timeout
- CLI project scaffolding (4 templates)
- TypeScript definitions
- OpenAPI/Swagger docs
- Zod request validation middleware
- `beforeRoutes` / `afterRoutes` hooks

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
  const server = app.listen(3000, () => console.log('🚀 Server running on port 3000'));

  // Wire server into shutdown handler for graceful shutdown
  const { setServer } = await createApp({ ... });
  setServer(server);
}

main().catch(console.error);
```

---

## ⚙️ Configuration

### Server Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `3000` | Server port |
| `nodeEnv` | `string` | `'development'` | Environment (`development`, `production`, `test`) |
| `timeout` | `boolean\|number` | `30000` | Request timeout in ms |
| `shutdownTimeout` | `number` | `30000` | Graceful shutdown timeout in ms |
| `jsonLimit` | `string` | `'1mb'` | JSON body size limit |
| `urlencodedLimit` | `string` | `'1mb'` | URL-encoded body size limit |
| `staticDir` | `boolean\|string` | `false` | Static files directory |
| `sessionSecret` | `string\|null` | `null` | Secret for sessions & CSRF |

### Middleware Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `helmet` | `boolean\|object` | `true` | Security headers |
| `cors` | `boolean\|object` | `true` | Cross-origin requests |
| `compression` | `boolean\|object` | `{ level: 6 }` | Response compression |
| `morgan` | `boolean\|string` | `'dev'` | HTTP request logging format |
| `cookieParser` | `boolean\|string` | `true` | Cookie parsing (string = secret) |
| `rateLimit` | `boolean\|object` | `{ windowMs: 900000, max: 100 }` | Rate limiting |
| `session` | `boolean` | `false` | Session support (Redis store when Redis enabled) |
| `csrf` | `boolean` | `false` | CSRF protection with replay prevention |
| `requestId` | `boolean` | `true` | Adds `X-Request-Id` header |
| `cache` | `boolean\|object` | `{ ttl: 60, enabled: false, maxSize: 500 }` | Response caching (LRU + optional Redis) |
| `xssClean` | `boolean` | `true` | XSS sanitization |
| `hpp` | `boolean` | `true` | HTTP parameter pollution protection |
| `noCacheAuthRoutes` | `boolean` | `true` | Disable caching on auth routes |

### Database Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `database.url` | `string\|null` | `null` | Database URL (overrides other settings) |
| `database.dialect` | `string` | `'sqlite'` | `postgres`, `mysql`, `sqlite`, `mariadb`, `mssql` |
| `database.storage` | `string` | `':memory:'` | SQLite storage path |
| `database.host` | `string` | — | Database host |
| `database.port` | `number` | — | Database port |
| `database.pool.max` | `number` | `10` | Max pool size |
| `database.pool.min` | `number` | `0` | Min pool size |
| `database.retry.max` | `number` | `3` | Connection retry count |
| `database.sync` | `boolean\|object` | `false` | Auto-sync models (`{ alter: true }` or `{ force: true }`) |

### Redis Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `redis.url` | `string\|null` | `null` | Redis connection URL (`redis://localhost:6379`) |
| `redis.enabled` | `boolean` | `false` | Enable Redis integration |

When Redis is enabled, it automatically powers:
- **Session store** — persistent sessions via `connect-redis`
- **Rate-limit store** — distributed rate limiting via `rate-limit-redis`
- **Cache backend** — shared response cache across instances
- **CSRF token tracking** — replay prevention across restarts

### Advanced Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `healthCheck.path` | `string` | `'/health'` | Custom health check endpoint path |
| `healthCheck.readyPath` | `string` | `'/ready'` | Custom readiness endpoint path |
| `swagger` | `boolean\|object` | `false` | Enable OpenAPI docs at `/api-docs` |
| `swagger.title` | `string` | `'Express Starter API'` | API title |
| `swagger.version` | `string` | `'1.0.0'` | API version |
| `validation.enabled` | `boolean` | `false` | Enable Zod validation middleware |
| `beforeRoutes` | `function` | — | Hook to add routes before built-in routes |
| `afterRoutes` | `function` | — | Hook to add routes after built-in routes |
| `models` | `string` | `'models/**/*.js'` | Glob pattern for auto-loading models |
| `transactionMiddleware` | `boolean` | `false` | Enable per-request transactions |

---

## 📖 API Reference

### `createApp(config?)`

Returns `Promise<CreateAppResult>`:

| Property | Type | Description |
|----------|------|-------------|
| `app` | `Express` | Configured Express application instance |
| `ready` | `Promise<void>` | Resolves when database connection is established |
| `shutdown` | `() => Promise<void>` | Gracefully shut down server, DB, and Redis |
| `sequelize` | `Sequelize` | Sequelize ORM instance |
| `metrics` | `MetricsInterface` | Prometheus metrics registry |
| `redisClient` | `RedisClientType\|null` | Redis client (if enabled) |
| `setServer` | `(server) => void` | Wire HTTP server into shutdown handler |

### Built-in Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` (or custom) | GET | `{ status: 'ok', uptime, timestamp }` |
| `/ready` (or custom) | GET | `{ status: 'ready' }` or `503` if DB is down |
| `/metrics` | GET | Prometheus metrics in text/plain format |
| `/api-docs` | GET | OpenAPI 3.0.3 spec (JSON) or Swagger UI (HTML) |

### Using Hooks

```javascript
const { app } = await createApp({
  beforeRoutes: (app) => {
    // These routes run BEFORE built-in health/metrics endpoints
    app.get('/api/public', (req, res) => res.json({ public: true }));
  },
  afterRoutes: (app) => {
    // These routes run AFTER built-in endpoints but BEFORE 404 handler
    app.get('/api/catchall', (req, res) => res.json({ caught: true }));
  },
});
```

### Request Validation

```javascript
const { z } = require('zod');
const { createValidationMiddleware } = require('express-starter-pro');

app.post('/users', createValidationMiddleware({
  body: z.object({
    email: z.string().email(),
    age: z.number().min(0).max(150),
  }),
  query: z.object({
    include: z.string().optional(),
  }),
}), (req, res) => {
  // req.body is validated and typed
  res.json(req.body);
});
```

### Graceful Shutdown

```javascript
const { app, ready, setServer } = await createApp(config);
await ready;

const server = app.listen(3000);
setServer(server); // Ensures HTTP server closes on shutdown

// Or manually:
await appInstance.shutdown();
```

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

### What You Get

Each scaffolded project includes:
- `src/index.js` — entry point with `createApp`
- `models/User.js` — example Sequelize model
- `routes/auth.js` — auth routes (auth/full templates)
- `__tests__/app.test.js` — basic integration tests
- `Dockerfile` + `docker-compose.yml`
- `.env.example` + `.gitignore`
- `package.json` with all dependencies

---

## 🌱 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `DATABASE_URL` | Database connection string | — |
| `SESSION_SECRET` | Session secret | — |
| `REDIS_URL` | Redis connection string | — |
| `LOG_LEVEL` | Log level (`error`/`warn`/`info`/`debug`) | `debug` |

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

Models are auto-loaded from the `models/` directory. Each file exports a function `(sequelize) => Model`.

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
| 7 | Manual shutdown | `setServer(server)` + auto shutdown on SIGTERM/SIGINT |

---

## ❓ Troubleshooting

| Issue | Solution |
|-------|----------|
| Database connection fails | Check `DATABASE_URL`, ensure DB is running, verify credentials |
| Session not working | Set `SESSION_SECRET` and enable `session: true` in config |
| Rate limiting too strict | Adjust `rateLimit.windowMs` and `rateLimit.max` |
| CSRF errors on POST | Include `X-CSRF-Token` header from the `csrf-token` cookie |
| Redis connection refused | Ensure Redis is running, or set `redis.enabled: false` to fall back gracefully |
| Cache not working | Enable with `cache: { enabled: true, ttl: 60 }` |
| Metrics not showing | Hit `/metrics` endpoint after some requests have been made |
| Swagger UI not loading | Enable with `swagger: true` and visit `/api-docs` in a browser |
| Validation errors | Use `createValidationMiddleware({ body: zodSchema })` on your routes |

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

[MIT](LICENSE) © Jpkoech30
