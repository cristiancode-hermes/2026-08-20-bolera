import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingsService } from '../core/bookings.service';
import type { Booking } from '../shared/models';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-my-bookings-page',
  imports: [RouterLink],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Mis partidas</h1>
          <p class="page-subtitle text-muted mb-0">Historial y próximas reservas</p>
        </div>
        <a routerLink="/pistas" class="btn btn-primary btn-sm">Reservar</a>
      </div>

      <div class="tabs">
        @for (t of tabs; track t.id) {
          <button
            type="button"
            class="tab"
            [class.active]="scope() === t.id"
            (click)="setScope(t.id)"
          >
            {{ t.label }}
          </button>
        }
      </div>

      @if (loading()) {
        <p class="text-muted">Cargando…</p>
      } @else if (error()) {
        <div class="error-state">
          <h3>Error</h3>
          <p>{{ error() }}</p>
          <button type="button" class="btn btn-primary" (click)="load()">Reintentar</button>
        </div>
      } @else if (items().length === 0) {
        <div class="empty-state">
          <h3>Aún no has jugado</h3>
          <p>Reserva una pista y aparece aquí.</p>
          <a routerLink="/pistas" class="btn btn-primary">Reservar pista</a>
        </div>
      } @else {
        <div class="booking-list">
          @for (b of items(); track b.id) {
            <a class="card booking-row" [routerLink]="['/mis-partidas', b.id]">
              <div>
                <strong class="text-ink">
                  {{ b.lane?.name || b.laneName || 'Pista' }}
                  @if (b.laneNumber || b.lane?.number) {
                    · #{{ b.laneNumber || b.lane?.number }}
                  }
                </strong>
                <p class="text-sm mb-0">
                  {{ formatDateShort(b.slot?.date || b.date) }}
                  ·
                  {{ b.slot?.startTime || b.startTime }}
                  ·
                  {{ b.partySize }} jug.
                </p>
              </div>
              <div style="text-align: right">
                <span [class]="statusBadgeClass(b.status)">{{ statusLabel(b.status) }}</span>
                <div class="price mt-2">{{ eur(b.totalCents) }}</div>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class MyBookingsPageComponent extends FormatBase implements OnInit {
  private readonly bookingsApi = inject(BookingsService);

  protected readonly tabs = [
    { id: 'upcoming' as const, label: 'Próximas' },
    { id: 'past' as const, label: 'Pasadas' },
    { id: 'all' as const, label: 'Todas' },
  ];

  protected readonly scope = signal<'upcoming' | 'past' | 'all'>('upcoming');
  protected readonly items = signal<Booking[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  protected setScope(s: 'upcoming' | 'past' | 'all'): void {
    this.scope.set(s);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.bookingsApi.mine(this.scope()).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Error de red');
        this.loading.set(false);
      },
    });
  }
}
