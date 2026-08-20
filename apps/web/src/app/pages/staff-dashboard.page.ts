import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatsService } from '../core/stats.service';
import type { RevenuePoint, StatsKpis } from '../shared/models';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-staff-dashboard-page',
  imports: [RouterLink],
  template: `
    <div class="container page">
      <div class="row-between mb-4">
        <div>
          <h1>Staff</h1>
          <p class="text-muted mb-0">Ocupación e ingresos del local</p>
        </div>
        <div class="inline-actions">
          <a routerLink="/staff/pistas" class="btn btn-secondary btn-sm">Pistas</a>
          <a routerLink="/staff/franjas" class="btn btn-secondary btn-sm">Franjas</a>
        </div>
      </div>

      @if (loading()) {
        <p class="text-muted">Cargando estadísticas…</p>
      } @else {
        <div class="kpi-grid">
          <div class="kpi">
            <span class="kpi-label">Ingresos hoy</span>
            <div class="kpi-value">{{ eur(kpis()?.revenueTodayCents ?? kpis()?.revenueCents) }}</div>
          </div>
          <div class="kpi">
            <span class="kpi-label">Ocupación</span>
            <div class="kpi-value">{{ kpis()?.occupancyPct ?? 0 }}%</div>
          </div>
          <div class="kpi">
            <span class="kpi-label">Confirmadas</span>
            <div class="kpi-value">{{ kpis()?.confirmedToday ?? kpis()?.confirmed ?? 0 }}</div>
          </div>
          <div class="kpi">
            <span class="kpi-label">No-shows</span>
            <div class="kpi-value">{{ kpis()?.noShows ?? 0 }}</div>
          </div>
        </div>

        <section class="card mt-4">
          <h2>Ingresos 7 días</h2>
          <p class="text-sm text-muted">Eje X = fechas · Y = euros · cursor para tooltip</p>
          <svg class="chart" viewBox="0 0 640 240" role="img" aria-label="Gráfico de ingresos">
            <line x1="48" y1="16" x2="48" y2="200" stroke="currentColor" stroke-opacity="0.35" />
            <line x1="48" y1="200" x2="620" y2="200" stroke="currentColor" stroke-opacity="0.35" />
            @for (tick of yTicks(); track tick.y) {
              <text
                [attr.x]="40"
                [attr.y]="tick.y + 4"
                text-anchor="end"
                font-size="10"
                fill="currentColor"
                opacity="0.7"
                >{{ tick.label }}</text
              >
              <line
                [attr.x1]="48"
                [attr.x2]="620"
                [attr.y1]="tick.y"
                [attr.y2]="tick.y"
                stroke="currentColor"
                stroke-opacity="0.08"
              />
            }
            @if (points().length > 1) {
              <polyline
                [attr.points]="poly()"
                fill="none"
                stroke="var(--color-primary)"
                stroke-width="2.5"
              />
            }
            @for (p of points(); track p.date) {
              <circle
                [attr.cx]="p.x"
                [attr.cy]="p.y"
                r="5"
                fill="var(--color-primary)"
                (mouseenter)="tip.set(p)"
                (mouseleave)="tip.set(null)"
              />
              <text
                [attr.x]="p.x"
                y="216"
                text-anchor="middle"
                font-size="9"
                fill="currentColor"
                opacity="0.75"
                >{{ p.short }}</text
              >
            }
          </svg>
          @if (tip()) {
            <div class="chart-tip">
              {{ tip()!.date }} · {{ eur(tip()!.revenueCents) }} · {{ tip()!.bookings }} partidas
            </div>
          }
        </section>
      }
    </div>
  `,
})
export class StaffDashboardPageComponent extends FormatBase implements OnInit {
  private readonly statsApi = inject(StatsService);

  protected readonly kpis = signal<StatsKpis | null>(null);
  protected readonly series = signal<RevenuePoint[]>([]);
  protected readonly loading = signal(true);
  protected readonly tip = signal<{
    date: string;
    short: string;
    x: number;
    y: number;
    revenueCents: number;
    bookings: number;
  } | null>(null);

  protected readonly points = computed(() => {
    const s = this.series();
    if (!s.length) return [];
    const max = Math.max(...s.map((r) => r.revenueCents ?? r.revenue ?? 0), 1);
    const w = 560;
    const h = 160;
    const left = 56;
    const top = 24;
    return s.map((r, i) => {
      const val = r.revenueCents ?? r.revenue ?? 0;
      const x = left + (s.length === 1 ? w / 2 : (i / (s.length - 1)) * w);
      const y = top + h - (val / max) * h;
      return {
        date: r.date,
        short: r.date.slice(5),
        x,
        y,
        revenueCents: val,
        bookings: r.bookings,
      };
    });
  });

  protected readonly poly = computed(() =>
    this.points()
      .map((p) => `${p.x},${p.y}`)
      .join(' '),
  );

  protected readonly yTicks = computed(() => {
    const s = this.series();
    const max = Math.max(...s.map((r) => r.revenueCents ?? r.revenue ?? 0), 1);
    return [0, 0.5, 1].map((f) => {
      const val = Math.round(max * f);
      const y = 24 + 160 - f * 160;
      return { y, label: (val / 100).toFixed(0) + '€' };
    });
  });

  ngOnInit(): void {
    let pending = 2;
    const done = () => {
      pending -= 1;
      if (pending <= 0) this.loading.set(false);
    };
    this.statsApi.overview().subscribe({
      next: (k) => {
        this.kpis.set(k);
        done();
      },
      error: () => done(),
    });
    this.statsApi.revenueSeries(7).subscribe({
      next: (pts) => {
        this.series.set(pts);
        done();
      },
      error: () => done(),
    });
  }
}
