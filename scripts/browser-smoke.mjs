#!/usr/bin/env node
/**
 * Bolera browser smoke — Spanish routes: /pistas, /mis-partidas, /staff
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer');

const BASE = process.env.BASE || 'https://bolera.proyectos.cristiancode.dev';
const OUT = process.env.OUT || '/opt/data/portafolio/public/assets';
const API = `${BASE}/api`;

const results = [];
const push = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`);
};

async function apiLogin(identifier = 'demo@bolera.dev') {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: 'demo1234' }),
  });
  const j = await r.json();
  if (!j.accessToken) throw new Error('login failed ' + r.status + ' ' + JSON.stringify(j));
  return j;
}

async function main() {
  const auth = await apiLogin();
  const h = { Authorization: `Bearer ${auth.accessToken}` };

  const lanes = await (await fetch(`${API}/lanes`, { headers: h })).json();
  const items = lanes.items || [];
  push('lanes list', items.length > 0, `n=${items.length}`);
  const lane = items[0];
  const detail = await (await fetch(`${API}/lanes/${lane.id}`, { headers: h })).json();
  const d = detail.lane || detail;
  push(
    'lane list↔detail price',
    Number(lane.basePriceCents) === Number(d.basePriceCents),
    `${lane.basePriceCents} vs ${d.basePriceCents}`,
  );

  const bookings = await (await fetch(`${API}/bookings/mine`, { headers: h })).json();
  const bitems = bookings.items || bookings || [];
  push('my bookings', Array.isArray(bitems) && bitems.length > 0, `n=${bitems.length}`);
  const b = bitems[0];
  const bd = await (await fetch(`${API}/bookings/${b.id}`, { headers: h })).json();
  const booking = bd.booking || bd;
  const listTotal = Number(b.totalCents ?? 0);
  const detTotal = Number(booking.totalCents ?? 0);
  push('booking list↔detail total', listTotal === detTotal && listTotal > 0, `${listTotal} vs ${detTotal}`);

  for (const p of ['/', '/login', '/pistas', `/pistas/${lane.id}`, '/mis-partidas', `/mis-partidas/${b.id}`, '/registro']) {
    const r = await fetch(`${BASE}${p}`);
    const t = await r.text();
    push(`spa shell ${p}`, r.status === 200 && t.includes('app-root'), `http=${r.status}`);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/opt/data/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const pageErrors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => pageErrors.push(String(e.message || e)));
    await page.setViewport({ width: 1440, height: 900 });
    await page.evaluateOnNewDocument((token) => {
      localStorage.setItem('bolera_token', token);
    }, auth.accessToken);

    async function assertPage(label, url, mustInclude) {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForSelector('app-root', { timeout: 20000 });
      await new Promise((r) => setTimeout(r, 2200));
      const text = await page.evaluate(() => document.body.innerText);
      const notFound = /Página no encontrada|Esa ruta no existe/i.test(text);
      const unexpected = /Error inesperado|RuntimeError|NG0\d{3}/i.test(text);
      const has = mustInclude.every((s) => text.toLowerCase().includes(s.toLowerCase()));
      push(label, !notFound && !unexpected && has && text.trim().length > 40, text.slice(0, 160).replace(/\s+/g, ' '));
      return text;
    }

    await assertPage('home', `${BASE}/`, ['Bolera']);
    await assertPage('pistas catalogue', `${BASE}/pistas`, ['Pista']);
    fs.mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: path.join(OUT, 'bolera.png'), fullPage: false });
    push('desktop screenshot', fs.statSync(path.join(OUT, 'bolera.png')).size > 20000, String(fs.statSync(path.join(OUT, 'bolera.png')).size));

    await assertPage('pista detail', `${BASE}/pistas/${lane.id}`, ['Pista']);
    const slotCount = await page.evaluate(() => document.querySelectorAll('.slot-btn, button.slot, [class*=slot]').length);
    push('pista detail has slots UI', slotCount > 0, `slots=${slotCount}`);

    await assertPage('mis-partidas', `${BASE}/mis-partidas`, ['partida']);
    await page.goto(`${BASE}/mis-partidas/${b.id}`, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2200));
    {
      const text = await page.evaluate(() => document.body.innerText);
      const notFound = /Página no encontrada/i.test(text);
      const unexpected = /Error inesperado|RuntimeError/i.test(text);
      push('booking detail content', !notFound && !unexpected && text.length > 50, text.slice(0, 140).replace(/\s+/g, ' '));
    }

    await page.goto(`${BASE}/staff`, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1500));
    const staffText = await page.evaluate(() => document.body.innerText + ' ' + location.pathname);
    push(
      'staff blocked for player',
      /login|pistas|inicio|no encontrad|forbidden|403/i.test(staffText) || !/KPI|ingresos/i.test(staffText),
      staffText.slice(0, 100).replace(/\s+/g, ' '),
    );

    const staffLogin = await apiLogin('staff@bolera.dev');
    await page.evaluate((token) => {
      localStorage.setItem('bolera_token', token);
    }, staffLogin.accessToken);
    await page.goto(`${BASE}/staff`, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2500));
    const st = await page.evaluate(() => document.body.innerText);
    const hasChart = await page.evaluate(() => document.querySelectorAll('svg.chart, svg, .chart').length);
    push('staff dashboard', !/Página no encontrada/i.test(st) && st.length > 40, st.slice(0, 140).replace(/\s+/g, ' '));
    push('staff charts present', hasChart > 0, `svg=${hasChart}`);

    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.evaluate((token) => localStorage.setItem('bolera_token', token), auth.accessToken);
    await page.goto(`${BASE}/pistas`, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2000));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    push(
      'mobile no horizontal overflow',
      !overflow,
      `scrollW=${await page.evaluate(() => document.documentElement.scrollWidth)}`,
    );
    await page.screenshot({ path: path.join(OUT, 'bolera-m.png'), fullPage: false });
    push('mobile screenshot', fs.statSync(path.join(OUT, 'bolera-m.png')).size > 15000);

    push(
      'no NG fatal errors',
      pageErrors.filter((e) => /NG0908|RuntimeError|-950/i.test(e)).length === 0,
      pageErrors.slice(0, 3).join(' | '),
    );
  } finally {
    await browser.close();
  }

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`\nSUMMARY ${pass}/${results.length} pass, ${fail} fail`);
  console.log(
    'verification_evidence:',
    JSON.stringify({ status: fail ? 'failed' : 'passed', kind: 'ad-hoc', checks: results.length, pass, fail }),
  );
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
