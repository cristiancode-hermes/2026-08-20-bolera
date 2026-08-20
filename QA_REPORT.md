# QA Report — 2026-08-20 bolera

**Project:** Bolera — reserva B2C de pistas de bowling por franja (hold → confirm → QR)
**Stack:** Angular 22 (zoneless) + NestJS 11 + TypeORM + better-sqlite3 + JWT
**Author:** Hermes Daily Builder / QA cron
**Date:** 2026-08-20
**Port / URL:** 3069 · https://bolera.proyectos.cristiancode.dev

## ✅ 1. Build Verification

| Target | Status | Details |
|--------|--------|---------|
| API `tsc -p tsconfig.build.json` | PASS | `dist/main.js` present |
| Web `ng build --configuration=production` | PASS | `apps/web/dist/web/browser/index.html` |
| Design lock | N/A | No `isFinalDesign.true` (new project) |

## ✅ 2. Test Results

**23/23** API unit/spec tests (Jest) — ALL PASSED  
Includes `booking-rules.spec.ts` (expiresAt, mutex semantics, points derivation).

| Suite | Result |
|-------|--------|
| booking-rules + auth/services | 23 green |

## ✅ 3. Endpoint / Runtime Smoke

Script: `scripts/qa-endpoint-test.sh` → **25/25 PASS** against `http://localhost:3069/api`

| Check | Result |
|-------|--------|
| Health | 200 |
| Login identifier + username alias | 200/201 + `accessToken` |
| Register unique | 201 |
| `/auth/me` auth / no-token 401 | PASS |
| Lanes list + detail | PASS |
| Hold booking + `expiresAt` server | PASS |
| Same-user / slot 409 | PASS (409 SLOT_TAKEN) |
| Confirm + QR SVG | PASS |
| Points = 15 × completed | PASS (30 = 2×15) |
| Cancel / sweeper presence | PASS |

Public Caddy: `https://bolera.proyectos.cristiancode.dev` → **200** (shell + `/api/health` + demo login).

## ✅ 4. Browser / Dynamic Routes

Routes are Spanish: `/pistas`, `/pistas/:id`, `/mis-partidas`, `/mis-partidas/:id`, `/staff`.

| Check | Result |
|-------|--------|
| Home / catalogue / detail (demo token) | PASS — no blank, no NG0908/-950 |
| Slots UI on detail | PASS (7 slots) |
| Mis partidas + detail | PASS — lista↔detalle total 3900=3900 |
| Lane price lista↔detalle | PASS 2800=2800 |
| Staff (staff token) | PASS — KPIs + SVG chart ejes/fechas/tooltip |
| Mobile 390px overflow | PASS scrollW=390 |
| Screenshots | `bolera.png` 114KB · `bolera-m.png` 83KB |

## ✅ 5. Quality / Accessibility

| Criterion | Verdict | Notes |
|-----------|---------|-------|
| Truth layer (B2C hold/confirm) | PASS | expiresAt server + sweeper + 409 |
| Charts real | PASS | revenue series axes + tip |
| contraste-hover 2026-08-19 | PASS* | `a:hover:not(.btn)`; btn-primary hover keeps `on-primary` |
| Dark primary-hover AA | PASS | fixed `#C45F28`→`#CC652E` (ratio ~4.73 ≥4.5) |
| Light primary/hover AA | PASS | on-primary cream on maple primary |
| Demo creds under login | PASS | `demo@bolera.dev` / `demo1234` |
| Login identifier (username OR email) | PASS | |

\*CSS audit on built styles + token contrast math.

## ✅ 6. Security Scan

| Check | Result |
|-------|--------|
| Auth interceptor Bearer | PASS (byte-verified; no `***` corruption) |
| No token on public routes | PASS |
| JWT on protected | PASS |
| Hardcoded secrets in repo | None found in app source |

## ✅ 7. Deployment

| Target | Result | Details |
|--------|--------|---------|
| Caddy | PASS | `bolera.proyectos.cristiancode.dev` → static + `/api*` → :3069 |
| manage-apis.sh | PASS | PORTS/NAMES/DIRS aligned index 53 → 3069 / bolera / 2026-08-20-bolera |
| GitHub | PASS | https://github.com/cristiancode-hermes/2026-08-20-bolera |
| README | PASS | blob/main/README.md 200 |
| Landing proyectos | PASS | entry after vitrina |
| Excel | PASS | row 86 |
| Portfolio es/en/pt | PASS | slug `bolera`, id heading-201 |
| Capture config | PASS | config.mjs + prod-capture (`bolera_token`) |

### Link verification

| Link | HTTP |
|------|------|
| href https://bolera.proyectos.cristiancode.dev | 200 |
| link2 README | 200 |
| link3 repo | 200 |
| deep `/pistas/1` shell | 200 |

## Minor notes

1. Same-user re-hold may surface as `SLOT_TAKEN` rather than `DUPLICATE_USER_SLOT` depending on check order — still **409** (acceptable).
2. Staff browser check requires fresh document token injection (in-memory auth signal); API + dedicated staff session PASS.

## Summary

**OVERALL: PASS ✅**

Published: Caddy (bolera.proyectos.cristiancode.dev :3069), GitHub, Landing, Excel, Portfolio (es+en+pt), capture registry.
