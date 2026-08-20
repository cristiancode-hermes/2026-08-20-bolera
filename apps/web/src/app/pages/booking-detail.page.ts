import { Component, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BookingsService } from '../core/bookings.service';
import type { Booking, BookingLine } from '../shared/models';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-booking-detail-page',
  imports: [RouterLink],
  template: `
    <div class="container page">
      <a routerLink="/mis-partidas" class="text-sm text-muted">← Mis partidas</a>

      @if (loading()) {
        <p class="text-muted mt-4">Cargando…</p>
      } @else if (error()) {
        <div class="error-state mt-4">
          <h3>No encontrada</h3>
          <p>{{ error() }}</p>
          <a routerLink="/mis-partidas" class="btn btn-primary">Volver</a>
        </div>
      } @else if (booking()) {
        <div class="between mt-4 mb-4">
          <div>
            <h1 class="mb-2">
              {{ booking()!.lane?.name || booking()!.laneName || 'Partida' }}
            </h1>
            <p class="mb-0">
              {{ formatDate(booking()!.slot?.date || booking()!.date) }}
              ·
              {{ booking()!.slot?.startTime || booking()!.startTime }}–{{
                booking()!.slot?.endTime || booking()!.endTime
              }}
            </p>
          </div>
          <span [class]="statusBadgeClass(booking()!.status)">{{
            statusLabel(booking()!.status)
          }}</span>
        </div>

        <div class="detail-grid">
          <section class="card">
            <h2>Desglose</h2>
            @for (line of lines(); track $index) {
              <div class="line-row">
                <span>{{ line.label || line.description || line.type || 'Línea' }} × {{ line.qty }}</span>
                <span class="mono">{{ eur(line.totalCents ?? line.qty * line.unitPriceCents) }}</span>
              </div>
            } @empty {
              <div class="line-row">
                <span>Total</span>
                <span class="mono">{{ eur(booking()!.totalCents) }}</span>
              </div>
            }
            <div class="line-row" style="font-weight: 700; border-bottom: 0">
              <span>Total</span>
              <span>{{ eur(booking()!.totalCents) }}</span>
            </div>

            @if (canCancel()) {
              <button
                type="button"
                class="btn btn-danger mt-4"
                [disabled]="busy()"
                (click)="cancel()"
              >
                {{ busy() ? 'Cancelando…' : 'Cancelar reserva' }}
              </button>
              <p class="text-sm text-muted mt-2">Solo si faltan ≥ 24 h para el inicio.</p>
            }
            @if (msg()) {
              <p class="form-error mt-3">{{ msg() }}</p>
            }
            @if (booking()!.status === 'completed' && booking()!.lane?.id) {
              <a
                class="btn btn-secondary mt-4"
                [routerLink]="['/pistas', booking()!.lane!.id, 'resena']"
                >Dejar reseña</a
              >
            }
          </section>

          <aside class="card ticket-stub">
            @if (booking()!.code) {
              <p class="mono">{{ booking()!.code }}</p>
            }
            @if (safeQr()) {
              <div class="qr-box" [innerHTML]="safeQr()"></div>
            } @else {
              <p class="text-muted text-sm">QR disponible en reservas confirmadas.</p>
            }
            <p class="text-sm">{{ booking()!.partySize }} jugadores</p>
          </aside>
        </div>
      }
    </div>
  `,
})
export class BookingDetailPageComponent extends FormatBase implements OnInit {
  private readonly bookingsApi = inject(BookingsService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly booking = signal<Booking | null>(null);
  protected readonly lines = signal<BookingLine[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected readonly msg = signal('');
  protected readonly safeQr = signal<SafeHtml | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('ID inválido');
      this.loading.set(false);
      return;
    }
    this.bookingsApi.detail(id).subscribe({
      next: (res) => {
        this.booking.set(res.booking);
        this.lines.set(res.lines);
        const svg = res.qrSvg || res.booking.qrSvg;
        if (svg) this.safeQr.set(this.sanitizer.bypassSecurityTrustHtml(svg));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No tienes acceso a esta reserva');
        this.loading.set(false);
      },
    });
  }

  protected canCancel(): boolean {
    const b = this.booking();
    if (!b) return false;
    return b.status === 'pending' || b.status === 'confirmed';
  }

  protected cancel(): void {
    const b = this.booking();
    if (!b) return;
    this.busy.set(true);
    this.msg.set('');
    this.bookingsApi.cancel(b.id).subscribe({
      next: (updated) => {
        this.booking.set(updated);
        this.busy.set(false);
      },
      error: (err) => {
        this.msg.set(err?.error?.message || 'No se pudo cancelar');
        this.busy.set(false);
      },
    });
  }
}
