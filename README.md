# Bolera

Reserva de pistas de bowling por franja (B2C). Angular 22 + NestJS 11 + SQLite.

## Demo

- **Web:** https://bolera.proyectos.cristiancode.dev
- **API:** `POST /api/auth/login` · Swagger `/api/docs`
- **Credenciales:** `demo@bolera.dev` / `demo1234` (también `staff@` / `admin@`)

## Stack

| Capa | Tech |
|------|------|
| Frontend | Angular 22 (zoneless, signals) |
| Backend | NestJS 11 + TypeORM + JWT |
| DB | better-sqlite3 (dev) / Postgres-ready |
| Puerto | 3069 |

## Features

- Plano de pistas + franjas 60'
- Hold 15 min con `expiresAt` server-side + sweeper ~30s
- Anti doble-venta y anti doble-reserva same-user (HTTP 409)
- Confirmación con QR SVG + email simulado
- Mis partidas con totales lista ↔ detalle
- Puntos socio = 15 × bookings `completed`
- Panel staff: KPIs + serie de ingresos (ejes/fechas)

## Desarrollo

```bash
# API
cd apps/api && npm install && npm run build
PORT=3069 node dist/main.js

# Web
cd apps/web && npm install && npm run build
```

## Tests

```bash
cd apps/api && npm test
# 23 tests (reglas de booking, mutex, puntos, cancelación, QR)
```

## Licencia

MIT — proyecto Daily Builder (Hermes).
