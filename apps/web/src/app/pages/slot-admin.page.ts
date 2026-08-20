import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LanesService } from '../core/lanes.service';
import { StatsService } from '../core/stats.service';
import type { DayBoardRow, Lane } from '../shared/models';
import { FormatBase, todayISO } from '../shared/format';

const DEFAULT_TIMES = [
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
];

@Component({
  selector: 'app-slot-admin-page',
  imports: [RouterLink, FormsModule],
  template: `
    <div class="container page">
      <div class="row-between mb-4">
        <div>
          <a routerLink="/staff" class="text-sm text-muted">← Staff</a>
          <h1 class="mt-2">Franjas del día</h1>
        </div>
        <a routerLink="/staff/pistas" class="btn btn-secondary btn-sm">Pistas</a>
      </div>

      <div class="filters-bar">
        <div class="form-group">
          <label class="form-label" for="date">Fecha</label>
          <input
            id="date"
            class="input"
            type="date"
            [ngModel]="date()"
            (ngModelChange)="date.set($event); loadBoard()"
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="lane">Pista</label>
          <select
            id="lane"
            class="select"
            [ngModel]="laneId()"
            (ngModelChange)="laneId.set($event)"
          >
            <option value="">— elegir —</option>
            @for (l of lanes(); track l.id) {
              <option [value]="l.id">#{{ l.number }} {{ l.name }}</option>
            }
          </select>
        </div>
        <button
          type="button"
          class="btn btn-primary"
          [disabled]="!laneId() || busy()"
          (click)="generate()"
        >
          {{ busy() ? 'Generando…' : 'Generar franjas' }}
        </button>
      </div>

      @if (msg()) {
        <div class="alert alert-success">{{ msg() }}</div>
      }
      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      }

      @if (loading()) {
        <p class="text-muted">Cargando tablero…</p>
      } @else if (rows().length === 0) {
        <div class="empty-state">
          <h3>Sin franjas</h3>
          <p>Elige pista y genera el día.</p>
        </div>
      } @else {
        <table class="table">
          <thead>
            <tr>
              <th>Pista</th>
              <th>Hora</th>
              <th>Estado</th>
              <th>Reserva</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track r.slotId || r.id || r.startTime + (r.laneId || '')) {
              <tr>
                <td>{{ r.laneName || ('#' + (r.laneNumber || '—')) }}</td>
                <td class="mono">{{ r.startTime }}@if (r.endTime) {–{{ r.endTime }}}</td>
                <td>
                  @if (r.blocked) {
                    <span class="badge badge-danger">Bloqueada</span>
                  } @else {
                    <span class="badge badge-success">{{ r.status || 'free' }}</span>
                  }
                </td>
                <td class="mono text-sm">{{ r.bookingCode || '—' }}</td>
                <td>
                  @if (r.slotId || r.id) {
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm"
                      (click)="toggleBlock(r)"
                    >
                      {{ r.blocked ? 'Desbloquear' : 'Bloquear' }}
                    </button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class SlotAdminPageComponent extends FormatBase implements OnInit {
  private readonly lanesApi = inject(LanesService);
  private readonly statsApi = inject(StatsService);

  protected readonly date = signal(todayISO());
  protected readonly laneId = signal('');
  protected readonly lanes = signal<Lane[]>([]);
  protected readonly rows = signal<DayBoardRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly msg = signal('');
  protected readonly error = signal('');

  ngOnInit(): void {
    this.lanesApi.list().subscribe({
      next: (res) => this.lanes.set(res.items),
      error: () => this.lanes.set([]),
    });
    this.loadBoard();
  }

  protected loadBoard(): void {
    this.loading.set(true);
    this.statsApi.dayBoard(this.date()).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.loading.set(false);
      },
    });
  }

  protected generate(): void {
    const id = this.laneId();
    if (!id) return;
    this.busy.set(true);
    this.msg.set('');
    this.error.set('');
    this.lanesApi.generateSlots(id, { date: this.date(), times: DEFAULT_TIMES }).subscribe({
      next: (res) => {
        this.msg.set(`Creadas ${res.created ?? 0} franjas`);
        this.busy.set(false);
        this.loadBoard();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'No se pudieron generar');
        this.busy.set(false);
      },
    });
  }

  protected toggleBlock(r: DayBoardRow): void {
    const id = r.slotId ?? r.id;
    if (id == null) return;
    this.lanesApi.blockSlot(id, !r.blocked).subscribe({
      next: () => this.loadBoard(),
      error: () => {
        /* ignore */
      },
    });
  }
}
