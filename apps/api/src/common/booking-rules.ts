import type { BookingStatus } from '../entities/entities';

export const HOLD_MINUTES = 15;
export const POINTS_PER_COMPLETED = 15;
export const CANCEL_HOURS = 24;

export const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled', 'expired'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  expired: [],
  no_show: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return (TRANSITIONS[from] || []).includes(to);
}

export function hasDuplicateUserSlot(
  existing: { userId: number; slotId: number; status: BookingStatus }[],
  userId: number,
  slotId: number,
): boolean {
  return existing.some(
    (b) =>
      b.userId === userId &&
      b.slotId === slotId &&
      (b.status === 'pending' || b.status === 'confirmed'),
  );
}

export function pointsForCompleted(count: number): number {
  return count * POINTS_PER_COMPLETED;
}

export function sumLines(
  lines: { qty: number; unitPriceCents: number }[],
): number {
  return lines.reduce((a, l) => a + l.qty * l.unitPriceCents, 0);
}

export function canCancelByPolicy(
  hoursUntilStart: number,
  cancelHours = CANCEL_HOURS,
): boolean {
  return hoursUntilStart >= cancelHours;
}

export function validatePartySize(
  partySize: number,
  maxPlayers: number,
): { ok: boolean; code?: string } {
  if (!Number.isFinite(partySize) || partySize < 1 || partySize > maxPlayers) {
    return { ok: false, code: 'INVALID_PARTY_SIZE' };
  }
  return { ok: true };
}

/** Deterministic SVG "QR" placeholder. */
export function buildQrPlaceholderSvg(token: string, code: string): string {
  const cells = 21;
  const size = 168;
  const cell = size / cells;
  let rects = '';
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const h = hashByte(token, x, y);
      const border = x < 3 || y < 3 || x >= cells - 3 || y >= cells - 3;
      const finder =
        (x < 7 && y < 7) ||
        (x >= cells - 7 && y < 7) ||
        (x < 7 && y >= cells - 7);
      const on = finder ? finderOn(x, y, cells) : h % 2 === 0 || border;
      if (on) {
        rects += `<rect x="${(x * cell).toFixed(2)}" y="${(y * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="#1A1F1C"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size + 28}" width="${size}" height="${size + 28}" role="img" aria-label="QR ${code}"><rect width="100%" height="100%" fill="#fff"/>${rects}<text x="${size / 2}" y="${size + 18}" text-anchor="middle" font-family="monospace" font-size="12" fill="#1A1F1C">${code}</text></svg>`;
}

function hashByte(token: string, x: number, y: number): number {
  let h = 0;
  const s = `${token}:${x},${y}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function finderOn(x: number, y: number, cells: number): boolean {
  const regions = [
    [0, 0],
    [cells - 7, 0],
    [0, cells - 7],
  ];
  for (const [ox, oy] of regions) {
    const lx = x - ox;
    const ly = y - oy;
    if (lx >= 0 && lx < 7 && ly >= 0 && ly < 7) {
      if (lx === 0 || ly === 0 || lx === 6 || ly === 6) return true;
      if (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4) return true;
      return false;
    }
  }
  return false;
}

export function madridDate(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function parseMadridLocal(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+02:00`);
}

export function isLivePending(
  status: BookingStatus,
  expiresAt: Date | string | null,
  now = new Date(),
): boolean {
  if (status !== 'pending') return false;
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > now.getTime();
}

export function slotIsBusy(
  blocked: boolean,
  activeBookings: { status: BookingStatus; expiresAt: Date | string | null }[],
  now = new Date(),
): 'blocked' | 'busy' | 'free' {
  if (blocked) return 'blocked';
  const busy = activeBookings.some(
    (b) =>
      b.status === 'confirmed' ||
      b.status === 'completed' ||
      isLivePending(b.status, b.expiresAt, now),
  );
  return busy ? 'busy' : 'free';
}
