import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import type { Booking, BookingLine } from '../shared/models';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class BookingsService {
  private readonly http = inject(HttpClient);

  hold(
    slotId: string | number,
    body: {
      partySize: number;
      shoeSizes?: number[];
      addonIds?: Array<string | number>;
      bringOwnShoes?: boolean;
    },
  ): Observable<Booking> {
    return this.http
      .post<Booking | { booking: Booking }>(`${API}/slots/${slotId}/hold`, body)
      .pipe(
        map((res) =>
          'booking' in (res as object) ? (res as { booking: Booking }).booking : (res as Booking),
        ),
      );
  }

  confirm(
    id: string | number,
    body: { paymentMethod?: string } = { paymentMethod: 'sim' },
  ): Observable<{ booking: Booking; qrSvg?: string; emailPreview?: string }> {
    return this.http
      .post<{ booking: Booking; qrSvg?: string; emailPreview?: string } | Booking>(
        `${API}/bookings/${id}/confirm`,
        body,
      )
      .pipe(
        map((res) => {
          if (res && typeof res === 'object' && 'booking' in res) {
            return res as { booking: Booking; qrSvg?: string; emailPreview?: string };
          }
          const b = res as Booking;
          return { booking: b, qrSvg: b.qrSvg };
        }),
      );
  }

  mine(scope: 'upcoming' | 'past' | 'all' = 'all'): Observable<{ items: Booking[]; total: number }> {
    const params = new HttpParams().set('scope', scope);
    return this.http
      .get<Booking[] | { items: Booking[]; total: number }>(`${API}/bookings/mine`, { params })
      .pipe(
        map((res) => {
          if (Array.isArray(res)) return { items: res, total: res.length };
          return { items: res.items ?? [], total: res.total ?? res.items?.length ?? 0 };
        }),
      );
  }

  detail(id: string | number): Observable<{
    booking: Booking;
    lines: BookingLine[];
    qrSvg?: string;
  }> {
    return this.http
      .get<{ booking: Booking; lines?: BookingLine[]; qrSvg?: string } | Booking>(
        `${API}/bookings/${id}`,
      )
      .pipe(
        map((res) => {
          if (res && typeof res === 'object' && 'booking' in res) {
            const r = res as { booking: Booking; lines?: BookingLine[]; qrSvg?: string };
            return {
              booking: r.booking,
              lines: r.lines ?? r.booking.lines ?? [],
              qrSvg: r.qrSvg ?? r.booking.qrSvg,
            };
          }
          const b = res as Booking;
          return { booking: b, lines: b.lines ?? [], qrSvg: b.qrSvg };
        }),
      );
  }

  cancel(id: string | number): Observable<Booking> {
    return this.http
      .post<Booking | { booking: Booking }>(`${API}/bookings/${id}/cancel`, {})
      .pipe(
        map((res) =>
          'booking' in (res as object) ? (res as { booking: Booking }).booking : (res as Booking),
        ),
      );
  }

  complete(id: string | number): Observable<{ booking: Booking; pointsAwarded?: number }> {
    return this.http
      .post<{ booking: Booking; pointsAwarded?: number } | Booking>(
        `${API}/bookings/${id}/complete`,
        {},
      )
      .pipe(
        map((res) => {
          if (res && typeof res === 'object' && 'booking' in res) {
            return res as { booking: Booking; pointsAwarded?: number };
          }
          return { booking: res as Booking };
        }),
      );
  }

  noShow(id: string | number): Observable<Booking> {
    return this.http
      .post<Booking | { booking: Booking }>(`${API}/bookings/${id}/no-show`, {})
      .pipe(
        map((res) =>
          'booking' in (res as object) ? (res as { booking: Booking }).booking : (res as Booking),
        ),
      );
  }
}
