import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LanesService } from '../core/lanes.service';
import type { Lane } from '../shared/models';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-lanes-catalogue-page',
  imports: [RouterLink, FormsModule, DecimalPipe],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Pistas</h1>
          <p class="page-subtitle text-muted mb-0">Plano del local · elige y reserva</p>
        </div>
      </div>

      <div class="filters-bar">
        <div class="form-group">
          <label class="form-label" for="q">Buscar</label>
          <input
            id="q"
            class="input"
            type="search"
            placeholder="Nombre o número"
            [ngModel]="query()"
            (ngModelChange)="query.set($event); load()"
          />
        </div>
        <label class="check-row" style="margin-bottom: 0">
          <input
            type="checkbox"
            [checked]="onlyFree()"
            (change)="onlyFree.set($any($event.target).checked); load()"
          />
          Solo libres hoy
        </label>
      </div>

      @if (loading()) {
        <div class="card-grid">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <div class="card"><div class="skeleton" style="height: 180px"></div></div>
          }
        </div>
      } @else if (error()) {
        <div class="error-state">
          <h3>Error al cargar</h3>
          <p>{{ error() }}</p>
          <button type="button" class="btn btn-primary" (click)="load()">Reintentar</button>
        </div>
      } @else if (lanes().length === 0) {
        <div class="empty-state">
          <h3>{{ onlyFree() ? 'Ninguna pista libre hoy' : 'No hay pistas activas' }}</h3>
          @if (onlyFree()) {
            <button type="button" class="btn btn-secondary" (click)="onlyFree.set(false); load()">
              Quitar filtro
            </button>
          }
        </div>
      } @else {
        <div class="card-grid">
          @for (lane of lanes(); track lane.id) {
            <a
              class="card lane-card"
              [routerLink]="lane.maintenance || !lane.active ? null : ['/pistas', lane.id]"
              [class.disabled]="lane.maintenance || !lane.active"
              (click)="lane.maintenance && $event.preventDefault()"
            >
              <div class="lane-swatch">
                <span class="lane-num">{{ lane.number }}</span>
              </div>
              <div class="lane-card-body">
                <div class="between">
                  <h3>{{ lane.name }}</h3>
                  @if (lane.maintenance || !lane.active) {
                    <span class="badge">Mantenimiento</span>
                  } @else if ((lane.freeSlotsToday ?? 1) > 0) {
                    <span class="badge chip-free">Abierta</span>
                  } @else {
                    <span class="badge chip-busy">Sin huecos</span>
                  }
                </div>
                <p class="text-sm mb-0">Hasta {{ lane.maxPlayers }} jugadores</p>
                <div class="lane-card-foot">
                  <span class="price">{{ eur(lane.basePriceCents) }}/h</span>
                  @if (lane.ratingAvg != null) {
                    <span class="text-sm text-muted">★ {{ lane.ratingAvg | number: '1.1-1' }}</span>
                  }
                </div>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class LanesCataloguePageComponent extends FormatBase implements OnInit {
  private readonly lanesApi = inject(LanesService);
  protected readonly lanes = signal<Lane[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly query = signal('');
  protected readonly onlyFree = signal(false);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.lanesApi
      .list({
        availableToday: this.onlyFree() ? true : undefined,
        q: this.query().trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.lanes.set(res.items);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Error de red');
          this.loading.set(false);
        },
      });
  }
}
