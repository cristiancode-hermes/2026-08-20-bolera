import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LanesService } from '../core/lanes.service';

@Component({
  selector: 'app-review-form-page',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container page">
      <a [routerLink]="['/pistas', laneId]" class="text-sm text-muted">← Volver a la pista</a>
      <h1 class="mt-3">Reseña</h1>
      <p class="text-muted">Solo tras completar una partida en esta pista.</p>

      <form class="card" style="max-width: 480px" (ngSubmit)="submit()">
        <div class="form-group">
          <span class="form-label">Puntuación</span>
          <div class="stars">
            @for (n of [1, 2, 3, 4, 5]; track n) {
              <button
                type="button"
                class="star-btn"
                [class.on]="rating() >= n"
                (click)="rating.set(n)"
                [attr.aria-label]="n + ' estrellas'"
              >
                ★
              </button>
            }
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="body">Comentario</label>
          <textarea
            id="body"
            class="textarea"
            rows="4"
            [ngModel]="body()"
            (ngModelChange)="body.set($event)"
            name="body"
            required
            maxlength="800"
          ></textarea>
        </div>
        @if (error()) {
          <p class="form-error">{{ error() }}</p>
        }
        @if (ok()) {
          <div class="alert alert-success">¡Gracias! Reseña publicada.</div>
        }
        <button type="submit" class="btn btn-primary" [disabled]="busy() || rating() < 1">
          {{ busy() ? 'Enviando…' : 'Publicar' }}
        </button>
      </form>
    </div>
  `,
})
export class ReviewFormPageComponent implements OnInit {
  private readonly lanesApi = inject(LanesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected laneId = '';
  protected readonly rating = signal(0);
  protected readonly body = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly ok = signal(false);

  ngOnInit(): void {
    this.laneId = this.route.snapshot.paramMap.get('id') || '';
  }

  protected submit(): void {
    if (!this.laneId || this.rating() < 1) return;
    this.busy.set(true);
    this.error.set('');
    this.lanesApi
      .createReview(this.laneId, { rating: this.rating(), body: this.body().trim() })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.ok.set(true);
          setTimeout(() => void this.router.navigate(['/pistas', this.laneId]), 1200);
        },
        error: (err) => {
          this.error.set(
            err?.error?.message || 'Solo puedes reseñar tras completar una partida',
          );
          this.busy.set(false);
        },
      });
  }
}
