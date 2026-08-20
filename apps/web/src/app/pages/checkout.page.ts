import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BookingsService } from '../core/bookings.service';
import { LanesService } from '../core/lanes.service';
import { MenuService } from '../core/menu.service';
import { AuthService } from '../core/auth.service';
import type { Booking, Lane, MenuItem, SlotView } from '../shared/models';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-checkout-page',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Checkout</h1>
          <p class="page-subtitle">
            @if (lane() && slot()) {
              {{ lane()!.name }} · {{ formatDate(slot()!.date) }} · {{ slot()!.startTime }}–{{ slot()!.endTime }}
            } @else {
              Reserva de pista
            }
          </p>
        </div>
        @if (booking()?.status === 'pending' && remainSec() > 0) {
          <div class="hold-timer">
            <span class="text-sm">Hold</span>
            <strong class="mono">{{ mmss(remainSec()) }}</strong>
          </div>
        }
      </div>

      @if (error()) {
        <div class="error-banner mb-3">{{ error() }}</div>
      }

      @if (!booking()) {
        <div class="checkout-grid">
          <section class="card">
            <h2>Grupo</h2>
            <div class="form-group">
              <label class="form-label" for="party">Jugadores (1–{{ maxPlayers() }})</label>
              <input
                id="party"
                class="input"
                type="number"
                min="1"
                [attr.max]="maxPlayers()"
                [ngModel]="partySize()"
                (ngModelChange)="partySize.set(+$event || 1)"
              />
            </div>
            <label class="check-row">
              <input type="checkbox" [checked]="bringOwn()" (change)="bringOwn.set($any($event.target).checked)" />
              Traigo zapatos propios
            </label>
            @if (!bringOwn()) {
              <p class="text-sm text-muted">Alquiler de zapatos × {{ partySize() }}</p>
            }
            <h3 class="mt-4">Bar (opcional)</h3>
            <div class="addon-list">
              @for (m of menu(); track m.id) {
                <label class="check-row">
                  <input
                    type="checkbox"
                    [checked]="selectedAddons().has(m.id)"
                    (change)="toggleAddon(m.id, $any($event.target).checked)"
                  />
                  <span>{{ m.name }}</span>
                  <span class="mono">{{ eur(m.priceCents) }}</span>
                </label>
              }
            </div>
            <button type="button" class="btn btn-primary btn-block mt-4" [disabled]="busy()" (click)="hold()">
              {{ busy() ? 'Reteniendo…' : 'Retener pista 15 min' }}
            </button>
          </section>
          <aside class="card card-muted">
            <h3>Resumen</h3>
            <p class="text-sm">La retención se calcula en servidor. Si cierras la pestaña, el hold sigue vivo hasta expirar.</p>
            <a routerLink="/pistas" class="btn btn-ghost">Cancelar</a>
          </aside>
        </div>
      } @else {
        <div class="checkout-grid">
          <section class="card">
            <h2>Confirmar pago</h2>
            <p>Estado: <span [class]="statusBadgeClass(booking()!.status)">{{ statusLabel(booking()!.status) }}</span></p>
            <ul class="lines-list">
              @for (l of booking()!.lines || []; track $index) {
                <li>
                  <span>{{ l.label || l.description }} × {{ l.qty }}</span>
                  <strong class="mono">{{ eur(l.totalCents ?? l.qty * l.unitPriceCents) }}</strong>
                </li>
              }
            </ul>
            <div class="between total-row">
              <span>Total</span>
              <strong class="mono">{{ eur(booking()!.totalCents) }}</strong>
            </div>
            <button type="button" class="btn btn-primary btn-block mt-4" [disabled]="busy() || booking()!.status !== 'pending'" (click)="pay()">
              {{ busy() ? 'Procesando…' : 'Pagar (simulado)' }}
            </button>
          </section>
        </div>
      }
    </div>
  `,
})
export class CheckoutPageComponent extends FormatBase implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingsApi = inject(BookingsService);
  private readonly lanesApi = inject(LanesService);
  private readonly menuApi = inject(MenuService);
  private readonly auth = inject(AuthService);

  protected readonly slot = signal<SlotView | null>(null);
  protected readonly lane = signal<Lane | null>(null);
  protected readonly menu = signal<MenuItem[]>([]);
  protected readonly booking = signal<Booking | null>(null);
  protected readonly partySize = signal(2);
  protected readonly bringOwn = signal(false);
  protected readonly selectedAddons = signal(new Set<string | number>());
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly remainSec = signal(0);
  protected readonly maxPlayers = signal(6);

  private slotId: string | number = '';
  private timer: ReturnType<typeof setInterval> | null = null;
  private onVis = () => this.resyncTimer();

  ngOnInit(): void {
    this.auth.bootstrap();
    this.slotId = this.route.snapshot.paramMap.get('slotId') || '';
    this.lanesApi.getSlot(this.slotId).subscribe({
      next: ({ slot, lane }) => {
        this.slot.set(slot);
        this.lane.set(lane);
        this.maxPlayers.set(lane?.maxPlayers || 6);
      },
      error: (err) => this.error.set(err?.error?.message || 'Franja no encontrada'),
    });
    this.menuApi.list().subscribe({
      next: (items) => this.menu.set(items.filter((m) => m.active !== false)),
      error: () => this.menu.set([]),
    });
    document.addEventListener('visibilitychange', this.onVis);
    window.addEventListener('focus', this.onVis);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this.onVis);
    window.removeEventListener('focus', this.onVis);
  }

  protected toggleAddon(id: string | number, on: boolean): void {
    const next = new Set(this.selectedAddons());
    if (on) next.add(id);
    else next.delete(id);
    this.selectedAddons.set(next);
  }

  protected hold(): void {
    this.busy.set(true);
    this.error.set('');
    const ps = Math.min(this.maxPlayers(), Math.max(1, this.partySize()));
    this.bookingsApi
      .hold(this.slotId, {
        partySize: ps,
        bringOwnShoes: this.bringOwn(),
        addonIds: Array.from(this.selectedAddons()),
        shoeSizes: this.bringOwn() ? [] : Array.from({ length: ps }, () => 42),
      })
      .subscribe({
        next: (b) => {
          this.booking.set(b);
          this.busy.set(false);
          this.startTimer(b.expiresAt);
        },
        error: (err) => {
          this.error.set(err?.error?.message || err?.error?.code || 'No se pudo retener');
          this.busy.set(false);
        },
      });
  }

  protected pay(): void {
    const b = this.booking();
    if (!b) return;
    this.busy.set(true);
    this.error.set('');
    this.bookingsApi.confirm(b.id).subscribe({
      next: (res) => {
        this.busy.set(false);
        void this.router.navigate(['/reservas', res.booking.id, 'confirmacion'], {
          state: { qrSvg: res.qrSvg, booking: res.booking },
        });
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Pago fallido o hold expirado');
        this.busy.set(false);
      },
    });
  }

  private startTimer(expiresAt?: string | null): void {
    if (this.timer) clearInterval(this.timer);
    this.resyncTimer(expiresAt);
    this.timer = setInterval(() => this.resyncTimer(), 1000);
  }

  private resyncTimer(expiresAt?: string | null): void {
    const exp = expiresAt || this.booking()?.expiresAt;
    if (!exp) {
      this.remainSec.set(0);
      return;
    }
    const ms = new Date(exp).getTime() - Date.now();
    this.remainSec.set(Math.max(0, Math.floor(ms / 1000)));
  }
}
