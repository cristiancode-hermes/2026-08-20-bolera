import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import type { Lane, LaneDetail, Review, SlotView } from '../shared/models';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class LanesService {
  private readonly http = inject(HttpClient);

  list(q: { availableToday?: boolean | string; q?: string; page?: number } = {}): Observable<{
    items: Lane[];
    total: number;
  }> {
    let params = new HttpParams();
    if (q.availableToday != null && q.availableToday !== '') {
      params = params.set('availableToday', String(q.availableToday));
    }
    if (q.q) params = params.set('q', q.q);
    if (q.page != null) params = params.set('page', String(q.page));
    return this.http.get<Lane[] | { items: Lane[]; total: number }>(`${API}/lanes`, { params }).pipe(
      map((res) => {
        if (Array.isArray(res)) return { items: res, total: res.length };
        return { items: res.items ?? [], total: res.total ?? res.items?.length ?? 0 };
      }),
    );
  }

  featured(): Observable<Lane[]> {
    return this.http.get<Lane[] | { items: Lane[] }>(`${API}/lanes/featured`).pipe(
      map((res) => (Array.isArray(res) ? res : res.items ?? [])),
    );
  }

  detail(id: string | number): Observable<LaneDetail> {
    return this.http.get<Lane | LaneDetail>(`${API}/lanes/${id}`).pipe(
      map((res) => {
        if (res && typeof res === 'object' && 'lane' in res) return res as LaneDetail;
        const lane = res as Lane;
        return {
          lane,
          ratingAvg: lane.ratingAvg,
          ratingCount: lane.ratingCount,
        };
      }),
    );
  }

  slots(laneId: string | number, date: string): Observable<SlotView[]> {
    const params = new HttpParams().set('date', date);
    return this.http
      .get<SlotView[] | { slots: SlotView[] }>(`${API}/lanes/${laneId}/slots`, { params })
      .pipe(map((res) => (Array.isArray(res) ? res : res.slots ?? [])));
  }

  getSlot(id: string | number): Observable<{ slot: SlotView; lane: Lane }> {
    return this.http
      .get<{ slot: SlotView; lane: Lane } | (SlotView & { lane?: Lane })>(`${API}/slots/${id}`)
      .pipe(
        map((res) => {
          if (res && typeof res === 'object' && 'slot' in res) {
            return res as { slot: SlotView; lane: Lane };
          }
          const s = res as SlotView & { lane?: Lane };
          return { slot: s, lane: s.lane as Lane };
        }),
      );
  }

  create(body: Partial<Lane>): Observable<Lane> {
    return this.http.post<Lane | { lane: Lane }>(`${API}/lanes`, body).pipe(
      map((res) => ('lane' in (res as object) ? (res as { lane: Lane }).lane : (res as Lane))),
    );
  }

  update(id: string | number, body: Partial<Lane>): Observable<Lane> {
    return this.http.patch<Lane | { lane: Lane }>(`${API}/lanes/${id}`, body).pipe(
      map((res) => ('lane' in (res as object) ? (res as { lane: Lane }).lane : (res as Lane))),
    );
  }

  remove(id: string | number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${API}/lanes/${id}`);
  }

  generateSlots(
    laneId: string | number,
    body: { date: string; times: string[] },
  ): Observable<{ created: number }> {
    return this.http.post<{ created: number }>(`${API}/lanes/${laneId}/slots/generate`, body);
  }

  blockSlot(id: string | number, blocked: boolean): Observable<SlotView> {
    return this.http
      .patch<SlotView | { slot: SlotView }>(`${API}/slots/${id}/block`, { blocked })
      .pipe(
        map((res) =>
          'slot' in (res as object) ? (res as { slot: SlotView }).slot : (res as SlotView),
        ),
      );
  }

  reviews(laneId: string | number): Observable<{ items: Review[]; avg?: number; count?: number }> {
    return this.http
      .get<Review[] | { items: Review[]; avg?: number; count?: number }>(
        `${API}/lanes/${laneId}/reviews`,
      )
      .pipe(
        map((res) => {
          if (Array.isArray(res)) return { items: res, count: res.length };
          return { items: res.items ?? [], avg: res.avg, count: res.count };
        }),
      );
  }

  createReview(
    laneId: string | number,
    body: { rating: number; body: string },
  ): Observable<Review> {
    return this.http
      .post<Review | { review: Review }>(`${API}/lanes/${laneId}/reviews`, body)
      .pipe(
        map((res) =>
          'review' in (res as object) ? (res as { review: Review }).review : (res as Review),
        ),
      );
  }
}
