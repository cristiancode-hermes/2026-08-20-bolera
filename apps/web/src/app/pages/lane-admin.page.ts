import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LanesService } from '../core/lanes.service';
import type { Lane } from '../shared/models';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-lane-admin-page',
  imports: [RouterLink, FormsModule],
  template: `
    <div class="container page">
      <div class="row-between mb-4">
        <div>
          <a routerLink="/staff" class="text-sm text-muted">← Staff</a>
          <h1 class="mt-2">Pistas</h1>
        </div>
        <a routerLink="/staff/franjas" class="btn btn-secondary btn-sm">Franjas</a>
      </div>

      <section class="card mb-4">
        <h2>Nueva pista</h2>
        <form class="admin-form" (ngSubmit)="create()">
          <div class="form-row">
            <div class="form-group mb-0">
              <label class="form-label" for="num">Número</label>
              <input id="num" class="input" type="number" [(ngModel)]="form.number" name="number" required />
            </div>
            <div class="form-group mb-0">
              <label class="form-label" for="name">Nombre</label>
              <input id="name" class="input" type="text" [(ngModel)]="form.name" name="name" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group mb-0">
              <label class="form-label" for="max">Máx. jugadores</label>
              <input id="max" class="input" type="number" [(ngModel)]="form.maxPlayers" name="maxPlayers" />
            </div>
            <div class="form-group mb-0">
              <label class="form-label" for="price">Precio base (céntimos)</label>
              <input id="price" class="input" type="number" [(ngModel)]="form.basePriceCents" name="basePriceCents" />
            </div>
          </div>
          @if (formError()) {
            <p class="form-error">{{ formError() }}</p>
          }
          <button type="submit" class="btn btn-primary" [disabled]="busy()">Crear</button>
        </form>
      </section>

      @if (loading()) {
        <p class="text-muted">Cargando…</p>
      } @else {
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre</th>
              <th>Máx</th>
              <th>Precio</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (lane of lanes(); track lane.id) {
              <tr>
                <td class="mono">{{ lane.number }}</td>
                <td>{{ lane.name }}</td>
                <td>{{ lane.maxPlayers }}</td>
                <td>{{ eur(lane.basePriceCents) }}</td>
                <td>
                  @if (!lane.active || lane.maintenance) {
                    <span class="badge">Inactiva</span>
                  } @else {
                    <span class="badge badge-success">Activa</span>
                  }
                </td>
                <td>
                  <button type="button" class="btn btn-ghost btn-sm" (click)="toggle(lane)">
                    {{ lane.active && !lane.maintenance ? 'Desactivar' : 'Activar' }}
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class LaneAdminPageComponent extends FormatBase implements OnInit {
  private readonly lanesApi = inject(LanesService);

  protected readonly lanes = signal<Lane[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly formError = signal('');

  protected form = {
    number: 9,
    name: '',
    maxPlayers: 6,
    basePriceCents: 2400,
  };

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.lanesApi.list().subscribe({
      next: (res) => {
        this.lanes.set(res.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected create(): void {
    this.busy.set(true);
    this.formError.set('');
    this.lanesApi
      .create({
        number: Number(this.form.number),
        name: this.form.name.trim(),
        maxPlayers: Number(this.form.maxPlayers) || 6,
        basePriceCents: Number(this.form.basePriceCents) || 2400,
        active: true,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.form.name = '';
          this.load();
        },
        error: (err) => {
          this.formError.set(err?.error?.message || 'No se pudo crear');
          this.busy.set(false);
        },
      });
  }

  protected toggle(lane: Lane): void {
    const active = !(lane.active && !lane.maintenance);
    this.lanesApi.update(lane.id, { active, maintenance: !active }).subscribe({
      next: () => this.load(),
      error: () => {
        /* ignore */
      },
    });
  }
}
