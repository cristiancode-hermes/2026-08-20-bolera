import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import type { MenuItem } from '../shared/models';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);

  list(): Observable<MenuItem[]> {
    return this.http.get<MenuItem[] | { items: MenuItem[] }>(`${API}/menu`).pipe(
      map((res) => (Array.isArray(res) ? res : res.items ?? [])),
    );
  }

  create(body: Partial<MenuItem>): Observable<MenuItem> {
    return this.http.post<MenuItem | { item: MenuItem }>(`${API}/menu`, body).pipe(
      map((res) =>
        'item' in (res as object) ? (res as { item: MenuItem }).item : (res as MenuItem),
      ),
    );
  }

  update(id: string | number, body: Partial<MenuItem>): Observable<MenuItem> {
    return this.http.patch<MenuItem | { item: MenuItem }>(`${API}/menu/${id}`, body).pipe(
      map((res) =>
        'item' in (res as object) ? (res as { item: MenuItem }).item : (res as MenuItem),
      ),
    );
  }
}
