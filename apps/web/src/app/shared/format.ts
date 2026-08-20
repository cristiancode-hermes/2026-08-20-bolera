import { STATUS_LABELS } from './models';
import type { BookingStatus } from './models';

export function eur(cents: number | null | undefined): string {
  const n = (cents ?? 0) / 100;
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = iso.length <= 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = iso.length <= 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function addDaysISO(base: string, days: number): string {
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function statusLabel(s: BookingStatus | string): string {
  return STATUS_LABELS[s] || s;
}

export function statusBadgeClass(s: BookingStatus | string): string {
  switch (s) {
    case 'confirmed':
      return 'badge badge-success';
    case 'pending':
      return 'badge badge-warning';
    case 'completed':
      return 'badge badge-primary';
    case 'cancelled':
    case 'expired':
    case 'no_show':
      return 'badge badge-danger';
    default:
      return 'badge';
  }
}

export function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function slotState(s: { status?: string; state?: string; blocked?: boolean }): string {
  if (s.blocked || s.status === 'blocked' || s.state === 'blocked') return 'blocked';
  return (s.state || s.status || 'free').toLowerCase();
}

export abstract class FormatBase {
  readonly eur = eur;
  readonly formatDate = formatDate;
  readonly formatDateShort = formatDateShort;
  readonly statusLabel = statusLabel;
  readonly statusBadgeClass = statusBadgeClass;
  readonly mmss = mmss;
  readonly slotState = slotState;
}
