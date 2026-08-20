import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-minimal">
      <div class="auth-minimal-inner">
        <a routerLink="/" class="brand">
          <span class="brand-mark">B</span>
          <span>Bolera</span>
        </a>
        <h1>Entrar</h1>
        <p class="subtitle">Reserva tu pista</p>

        <form (ngSubmit)="submit()" autocomplete="off">
          <div class="form-group">
            <label class="form-label" for="identifier">Usuario o email</label>
            <input
              id="identifier"
              class="input-underline"
              name="identifier"
              type="text"
              autocomplete="off"
              [ngModel]="identifier()"
              (ngModelChange)="identifier.set($event)"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="password">Contraseña</label>
            <input
              id="password"
              class="input-underline"
              name="password"
              type="password"
              autocomplete="new-password"
              [ngModel]="password()"
              (ngModelChange)="password.set($event)"
              required
            />
          </div>
          @if (error()) {
            <p class="form-error">{{ error() }}</p>
          }
          <button type="submit" class="btn btn-primary btn-block" [disabled]="busy()">
            {{ busy() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>

        <div class="auth-demo">
          <strong class="text-ink">Demo:</strong>
          <code>demo&#64;bolera.dev</code> / <code>demo1234</code>
        </div>

        <p class="auth-switch">
          ¿No tienes cuenta?
          <a routerLink="/registro">Regístrate</a>
          ·
          <a routerLink="/">Inicio</a>
        </p>
      </div>
    </div>
  `,
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Empty signals — never prefill demo credentials */
  protected readonly identifier = signal('');
  protected readonly password = signal('');
  protected readonly error = signal('');
  protected readonly busy = signal(false);

  protected submit(): void {
    this.error.set('');
    this.busy.set(true);
    this.auth.login(this.identifier().trim(), this.password()).subscribe({
      next: () => {
        this.busy.set(false);
        const ret =
          this.route.snapshot.queryParamMap.get('returnUrl') ||
          this.route.snapshot.queryParamMap.get('next') ||
          '/';
        void this.router.navigateByUrl(ret);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Credenciales inválidas');
        this.busy.set(false);
      },
    });
  }
}
