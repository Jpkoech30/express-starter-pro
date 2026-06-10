# express-starter-pro

[![npm version](https://img.shields.io/npm/v/express-starter-pro)](https://www.npmjs.com/package/express-starter-pro)
[![Tests](https://github.com/Jpkoech30/express-starter-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/Jpkoech30/express-starter-pro/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/codecov/c/github/Jpkoech30/express-starter-pro)](https://codecov.io/gh/Jpkoech30/express-starter-pro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Production-ready Express.js application starter kit with Sequelize, Prometheus metrics, structured logging, and CLI scaffolding.

## Installation

```bash
npm install express-starter-pro
```

## Quick Start

```javascript
const { createApp } = require('express-starter-pro');

async function main() {
  const { app, ready } = await createApp({ port: 3000 });
  await ready;
  app.listen(3000, () => console.log('Server running'));
}

main().catch(console.error);
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `3000` | Server port |
| `nodeEnv` | `string` | `'development'` | Environment |
| `helmet` | `boolean\|object` | `true` | Helmet security headers |
| `cors` | `boolean\|object` | `true` | CORS configuration |
| `compression` | `boolean\|object` | `{ level: 6 }` | Compression middleware |
| `morgan` | `boolean\|string` | `'dev'` | HTTP request logging |
| `cookieParser` | `boolean\|string` | `true` | Cookie parsing |
| `rateLimit` | `boolean\|object` | `{ windowMs: 900000, max: 100 }` | Rate limiting |
| `session` | `boolean` | `false` | Session support |
| `jsonLimit` | `string` | `'1mb'` | JSON body limit |
| `urlencodedLimit` | `string` | `'1mb'` | URL-encoded body limit |
| `staticDir` | `boolean\|string` | `false` | Static file directory |
| `requestId` | `boolean` | `true` | X-Request-Id header |
| `timeout` | `boolean\|number` | `30000` | Request timeout (ms) |
| `csrf` | `boolean` | `false` | CSRF protection |
| `xssClean` | `boolean` | `true` | XSS sanitization |
| `hpp` | `boolean` | `true` | HTTP parameter pollution protection |
| `cache` | `boolean\|object` | `{ ttl: 60, enabled: false }` | Response caching |
| `logger` | `object\|null` | `null` | Custom logger (winston/pino) |
| `logLevel` | `string` | `'debug'` | Log level |
| `sessionSecret` | `string\|null` | `null` | Session secret (required if session enabled) |
| `shutdownTimeout` | `number` | `30000` | Graceful shutdown timeout |
| `transactionMiddleware` | `boolean` | `false` | Sequelize transaction per request |

### Database Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `database.url` | `string\|null` | `null` | Database URL |
| `database.dialect` | `string` | `'sqlite'` | Database dialect |
| `database.storage` | `string` | `':memory:'` | SQLite storage path |
| `database.pool.max` | `number` | `10` | Max pool size |
| `database.pool.min` | `number` | `0` | Min pool size |
| `database.retry.max` | `number` | `3` | Connection retry count |
| `database.sync` | `boolean\|object` | `false` | Auto-sync models |

## API Reference

### `createApp(config?)`

Returns `Promise<{ app, ready, shutdown, sequelize, metrics }>`

- **`app`** - Configured Express application
- **`ready`** - Promise resolving when DB is connected
- **`shutdown`** - Function to gracefully shut down
- **`sequelize`** - Sequelize instance
- **`metrics`** - Prometheus metrics registry

### Built-in Endpoints

- `GET /health` - `{ status: 'ok', uptime, timestamp }`
- `GET /ready` - `{ status: 'ready' }` or 503
- `GET /metrics` - Prometheus metrics

## CLI Usage

```bash
npx express-starter-pro init <projectName> [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--template` | Template: basic, auth, websocket, full | `basic` |
| `--db` | Database: postgres, mysql, sqlite | `postgres` |
| `--redis` | Include Redis | `false` |
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

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port |
| `DATABASE_URL` | Database connection string |
| `SESSION_SECRET` | Session secret |
| `REDIS_URL` | Redis connection string |
| `NODE_ENV` | Environment (development/production) |
| `LOG_LEVEL` | Log level (error/warn/info/debug) |

## Sequelize Model Example

```javascript
// models/User.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
  });

  User.associate = (models) => {
    User.hasMany(models.Post);
  };

  return User;
};
```

## Production Deployment

### Docker

```bash
docker build -t my-app .
docker run -p 3000:3000 my-app
```

### Docker Compose

```bash
docker-compose up
```

### PM2

```bash
npm install -g pm2
pm2 start index.js --name my-app
```

### Kubernetes

```bash
kubectl apply -f k8s/deployment.yaml
```

## Migration Guide from Vanilla Express

1. Install: `npm install express-starter-pro`
2. Replace `const app = express()` with `const { app, ready } = await createApp(config)`
3. Remove manual middleware setup (helmet, cors, etc.)
4. Add `await ready` before `app.listen()`
5. Use `req.log` instead of `console.log`
6. Use `req.id` for request tracing

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Database connection fails | Check DATABASE_URL, ensure DB is running |
| Session not working | Set SESSION_SECRET and enable session: true |
| Rate limiting too strict | Adjust rateLimit.windowMs and rateLimit.max |
| CSRF errors on POST | Include X-CSRF-Token header from cookie |
| Metrics not showing | Hit /metrics endpoint after some requests |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
