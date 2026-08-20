import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import type { DayBoardRow, RevenuePoint, StatsKpis } from '../shared/models';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);

  overview(): Observable<StatsKpis> {
    const params = new HttpParams().set('tz', 'Europe/Madrid');
    return this.http
      .get<StatsKpis | { kpis: StatsKpis }>(`${API}/stats/overview`, { params })
      .pipe(
        map((res) =>
          'kpis' in (res as object) ? (res as { kpis: StatsKpis }).kpis : (res as StatsKpis),
        ),
      );
  }

  revenueSeries(days = 7): Observable<RevenuePoint[]> {
    const params = new HttpParams().set('days', String(days));
    return this.http
      .get<RevenuePoint[] | { points: RevenuePoint[] }>(`${API}/stats/revenue-series`, { params })
      .pipe(
        map((res) => {
          const pts = Array.isArray(res) ? res : res.points ?? [];
          return pts.map((p) => ({
            ...p,
            revenue: p.revenue ?? p.revenueCents ?? 0,
            revenueCents: p.revenueCents ?? p.revenue ?? 0,
          }));
        }),
      );
  }

  dayBoard(date: string): Observable<DayBoardRow[]> {
    const params = new HttpParams().set('date', date);
    return this.http
      .get<DayBoardRow[] | { rows: DayBoardRow[] }>(`${API}/stats/day-board`, { params })
      .pipe(map((res) => (Array.isArray(res) ? res : res.rows ?? [])));
  }
}
