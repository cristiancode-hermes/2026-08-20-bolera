import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-register-page',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-minimal">
      <div class="auth-minimal-inner">
        <a routerLink="/" class="brand">
          <span class="brand-mark">B</span>
          <span>Bolera</span>
        </a>
        <h1>Registro</h1>
        <p class="subtitle">Crea tu cuenta de jugador</p>

        <form (ngSubmit)="submit()" autocomplete="off">
          <div class="form-group">
            <label class="form-label" for="username">Usuario</label>
            <input
              id="username"
              class="input-underline"
              name="username"
              type="text"
              autocomplete="off"
              [ngModel]="username()"
              (ngModelChange)="username.set($event)"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="email">Email</label>
            <input
              id="email"
              class="input-underline"
              name="email"
              type="email"
              autocomplete="off"
              [ngModel]="email()"
              (ngModelChange)="email.set($event)"
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
              minlength="6"
            />
          </div>
          @if (error()) {
            <p class="form-error">{{ error() }}</p>
          }
          <button type="submit" class="btn btn-primary btn-block" [disabled]="busy()">
            {{ busy() ? 'Creando…' : 'Crear cuenta' }}
          </button>
        </form>

        <p class="auth-switch">
          ¿Ya tienes cuenta?
          <a routerLink="/login">Entrar</a>
          ·
          <a routerLink="/">Inicio</a>
        </p>
      </div>
    </div>
  `,
})
export class RegisterPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly username = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly error = signal('');
  protected readonly busy = signal(false);

  protected submit(): void {
    this.error.set('');
    this.busy.set(true);
    this.auth
      .register({
        username: this.username().trim(),
        email: this.email().trim(),
        password: this.password(),
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          void this.router.navigateByUrl('/pistas');
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'No se pudo registrar');
          this.busy.set(false);
        },
      });
  }
}
