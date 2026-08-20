import { Component, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BookingsService } from '../core/bookings.service';
import type { Booking } from '../shared/models';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-confirmation-page',
  imports: [RouterLink],
  template: `
    <div class="container page">
      @if (loading()) {
        <p class="text-muted">Cargando confirmación…</p>
      } @else if (error()) {
        <div class="error-state">
          <h3>No se encontró la reserva</h3>
          <p>{{ error() }}</p>
          <a routerLink="/" class="btn btn-primary">Inicio</a>
        </div>
      } @else if (booking()) {
        <div class="ticket-stub card mt-4">
          <p class="badge badge-success mb-3">Confirmada</p>
          <h1>¡Pista reservada!</h1>
          <p class="text-ink">
            {{ booking()!.lane?.name || booking()!.laneName || 'Pista' }}
            ·
            {{ formatDate(booking()!.slot?.date || booking()!.date) }}
            {{ booking()!.slot?.startTime || booking()!.startTime }}
          </p>
          @if (booking()!.code) {
            <p class="mono">{{ booking()!.code }}</p>
          }
          @if (safeQr()) {
            <div class="qr-box" [innerHTML]="safeQr()"></div>
          }
          <p class="price">{{ eur(booking()!.totalCents) }}</p>
          <p class="text-sm text-muted">{{ booking()!.partySize }} jugadores</p>
          <div class="hero-actions" style="justify-content: center; margin-top: 1.5rem">
            <a class="btn btn-primary" [routerLink]="['/mis-partidas', booking()!.id]"
              >Ver en Mis partidas</a
            >
            <a class="btn btn-secondary" routerLink="/pistas">Otra pista</a>
          </div>
        </div>
      }
    </div>
  `,
})
export class ConfirmationPageComponent extends FormatBase implements OnInit {
  private readonly bookingsApi = inject(BookingsService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly booking = signal<Booking | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
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
        const svg = res.qrSvg || res.booking.qrSvg;
        if (svg) {
          this.safeQr.set(this.sanitizer.bypassSecurityTrustHtml(svg));
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Reserva no disponible');
        this.loading.set(false);
      },
    });
  }
}
