import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanesService } from '../core/lanes.service';
import type { Lane } from '../shared/models';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  template: `
    <div class="page">
      <div class="container">
        <section class="hero">
          <div class="hero-copy">
            <p class="eyebrow">Bolera · bowling social</p>
            <h1>Esta noche en Bolera</h1>
            <p class="lead">
              Ocho pistas, zapatos y bar. Elige día y franja, retiene 15 minutos y juega con
              ticket QR en el móvil.
            </p>
            <div class="hero-actions">
              <a routerLink="/pistas" class="btn btn-primary btn-lg">Reservar pista</a>
              <a routerLink="/pistas" class="btn btn-secondary btn-lg">Ver plano</a>
            </div>
          </div>
          <aside class="hero-panel">
            <h3>Horario hoy</h3>
            <ul class="hours-list">
              <li><span class="day">Lun — Jue</span><span class="time">16:00 – 23:00</span></li>
              <li><span class="day">Vie — Sáb</span><span class="time">16:00 – 00:00</span></li>
              <li><span class="day">Domingo</span><span class="time">16:00 – 22:00</span></li>
            </ul>
            <p class="text-sm text-muted mt-3 mb-0">Sesiones de 60 min · Europe/Madrid</p>
          </aside>
        </section>

        <section class="section">
          <div class="section-head">
            <h2>Pistas destacadas</h2>
            <a routerLink="/pistas">Catálogo completo →</a>
          </div>

          @if (loading()) {
            <div class="card-grid">
              @for (i of [1, 2, 3, 4]; track i) {
                <div class="card"><div class="skeleton" style="height: 160px"></div></div>
              }
            </div>
          } @else if (error()) {
            <div class="error-state">
              <h3>No se pudieron cargar las pistas</h3>
              <p>{{ error() }}</p>
              <button type="button" class="btn btn-primary" (click)="load()">Reintentar</button>
            </div>
          } @else if (featured().length === 0) {
            <div class="empty-state">
              <h3>Hoy no hay franjas publicadas</h3>
              <a routerLink="/pistas" class="btn btn-primary">Ver pistas</a>
            </div>
          } @else {
            <div class="card-grid">
              @for (lane of featured(); track lane.id) {
                <a class="card lane-card" [routerLink]="['/pistas', lane.id]">
                  <div class="lane-swatch">
                    <span class="lane-num">{{ lane.number }}</span>
                  </div>
                  <div class="lane-card-body">
                    <div class="between">
                      <h3>{{ lane.name }}</h3>
                      @if (lane.maintenance) {
                        <span class="badge">Mantenimiento</span>
                      } @else if ((lane.freeSlotsToday ?? 0) > 0) {
                        <span class="badge chip-free">Libre</span>
                      } @else {
                        <span class="badge chip-busy">Ocupada</span>
                      }
                    </div>
                    <p class="text-sm mb-0">Máx. {{ lane.maxPlayers }} jugadores</p>
                    <div class="lane-card-foot">
                      <span class="price">desde {{ eur(lane.basePriceCents) }}</span>
                      <span class="text-sm text-muted">{{ lane.freeSlotsToday ?? '—' }} huecos hoy</span>
                    </div>
                  </div>
                </a>
              }
            </div>
          }
        </section>

        <section class="section">
          <div class="card card-muted">
            <div class="between">
              <div>
                <h2 class="mb-0">Reserva tu franja</h2>
                <p class="mb-0 mt-2">
                  Hold de 15 min en servidor, zapatos por talla y add-ons del bar.
                </p>
              </div>
              <a routerLink="/pistas" class="btn btn-primary">Elegir pista</a>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
})
export class HomePageComponent extends FormatBase implements OnInit {
  private readonly lanesApi = inject(LanesService);
  protected readonly featured = signal<Lane[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.lanesApi.featured().subscribe({
      next: (items) => {
        this.featured.set(items.slice(0, 8));
        this.loading.set(false);
      },
      error: () => {
        // Fallback: list all
        this.lanesApi.list().subscribe({
          next: (res) => {
            this.featured.set(res.items.slice(0, 4));
            this.loading.set(false);
          },
          error: (err) => {
            this.error.set(err?.error?.message || 'Error de red');
            this.loading.set(false);
          },
        });
      },
    });
  }
}
