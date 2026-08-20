import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanesService } from '../core/lanes.service';
import type { Lane } from '../shared/models';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  template: `
    <div class="page home-page">
      <div class="container">
        <section class="hero">
          <div class="hero-copy">
            <p class="eyebrow">Bolera · bowling social</p>
            <h1>El strike empieza<span class="accent-inline"> aquí.</span></h1>
            <p class="lead">
              Ocho pistas, zapatos y bar. Elige día y franja, retiene 15 minutos y juega con
              ticket QR en el móvil.
            </p>
            <div class="hero-actions">
              <a routerLink="/pistas" class="btn btn-primary btn-lg">Reservar pista</a>
              <a routerLink="/pistas" class="btn btn-secondary btn-lg">Ver plano</a>
            </div>
            <div class="hero-ticker" aria-label="Estadística rápida">
              <span class="ticker-pip"></span>
              <span>Retención de <strong>15 min</strong> sin pagar</span>
            </div>
          </div>
          <aside class="hero-visual" aria-hidden="true">
            <div class="hero-photo-wrap">
              <img
                class="hero-photo"
                src="/assets/lanes/hero.jpg"
                alt=""
                width="640"
                height="440"
                loading="eager"
              />
              <span class="hero-chip chip-free">● 4 pistas libres ahora</span>
            </div>
            <div class="hero-panel">
              <h3>Horario hoy</h3>
              <ul class="hours-list">
                <li><span class="day">Lun — Jue</span><span class="time">16:00 – 23:00</span></li>
                <li><span class="day">Vie — Sáb</span><span class="time">16:00 – 00:00</span></li>
                <li><span class="day">Domingo</span><span class="time">16:00 – 22:00</span></li>
              </ul>
              <p class="text-sm text-muted mt-3 mb-0">Sesiones de 60 min · Europe/Madrid</p>
            </div>
          </aside>
        </section>

        <section class="section">
          <div class="section-head">
            <div>
              <p class="eyebrow">Esta noche</p>
              <h2>Pistas destacadas</h2>
            </div>
            <a routerLink="/pistas" class="link-arrow">Catálogo completo →</a>
          </div>

          @if (loading()) {
            <div class="card-grid">
              @for (i of [1, 2, 3, 4]; track i) {
                <div class="card lane-card"><div class="skeleton" style="height: 200px"></div></div>
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
                    <img
                      class="lane-photo"
                      [src]="laneImg(lane)"
                      [alt]="lane.name"
                      width="480"
                      height="270"
                      loading="lazy"
                    />
                    <span class="lane-num-badge">{{ lane.number }}</span>
                    @if (!lane.maintenance && (lane.freeSlotsToday ?? 0) > 0) {
                      <span class="lane-free-dot"><span class="dot"></span>{{ lane.freeSlotsToday }} huecos</span>
                    }
                  </div>
                  <div class="lane-card-body">
                    <div class="lane-card-top">
                      <h3>{{ lane.name }}</h3>
                      @if (lane.maintenance) {
                        <span class="badge">Mantenimiento</span>
                      } @else if ((lane.freeSlotsToday ?? 0) > 0) {
                        <span class="badge chip-free">Libre</span>
                      } @else {
                        <span class="badge chip-busy">Ocupada</span>
                      }
                    </div>
                    <p class="text-sm text-muted mb-0">Máx. {{ lane.maxPlayers }} jugadores</p>
                    <div class="lane-card-foot">
                      <span class="price">desde {{ eur(lane.basePriceCents) }}</span>
                      @if (lane.ratingAvg != null) {
                        <span class="text-sm text-muted">★ {{ lane.ratingAvg.toFixed(1) }}</span>
                      }
                    </div>
                  </div>
                </a>
              }
            </div>
          }
        </section>

        <section class="section cta-band">
          <div class="cta-band-inner">
            <div>
              <h2 class="mb-0">¿No sabes dónde jugar?</h2>
              <p class="mb-0 mt-2">
                Mira el plano del local, elige pista y franja y retén tu hueco en 15 minutos.
              </p>
            </div>
            <a routerLink="/pistas" class="btn btn-primary btn-lg">Elegir pista</a>
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

  protected laneImg(lane: Lane): string {
    return lane.imageUrl || `/assets/lanes/lane-${lane.number}.jpg`;
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
