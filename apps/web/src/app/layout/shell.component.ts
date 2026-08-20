import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <header class="topnav">
        <div class="container topnav-inner">
          <a routerLink="/" class="brand" (click)="menuOpen.set(false)">
            <span class="brand-mark">B</span>
            <span>Bolera</span>
          </a>

          <button
            type="button"
            class="nav-toggle"
            (click)="menuOpen.update((v) => !v)"
            [attr.aria-expanded]="menuOpen()"
            aria-label="Menú"
          >
            ☰
          </button>

          <ul class="nav-links" [class.open]="menuOpen()">
            <li>
              <a
                routerLink="/"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: true }"
                (click)="closeMenu()"
                >Inicio</a
              >
            </li>
            <li>
              <a routerLink="/pistas" routerLinkActive="active" (click)="closeMenu()">Pistas</a>
            </li>
            @if (auth.isAuthenticated()) {
              <li>
                <a routerLink="/mis-partidas" routerLinkActive="active" (click)="closeMenu()"
                  >Mis partidas</a
                >
              </li>
            }
            @if (auth.isStaff()) {
              <li>
                <a routerLink="/staff" routerLinkActive="active" (click)="closeMenu()">Staff</a>
              </li>
            }
          </ul>

          <div class="nav-actions">
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              (click)="theme.toggle()"
              [attr.aria-label]="theme.isDark() ? 'Modo claro' : 'Modo oscuro'"
            >
              {{ theme.isDark() ? '☀' : '☾' }}
            </button>
            @if (auth.isAuthenticated()) {
              <span class="user-chip hide-sm">
                <strong>{{ auth.user()?.name || auth.user()?.username }}</strong>
                <span class="points-chip">{{ auth.user()?.points ?? 0 }} pts</span>
              </span>
              <button type="button" class="btn btn-secondary btn-sm" (click)="auth.logout()">
                Salir
              </button>
            } @else {
              <a routerLink="/login" class="btn btn-secondary btn-sm" (click)="closeMenu()"
                >Entrar</a
              >
              <a
                routerLink="/registro"
                class="btn btn-primary btn-sm hide-sm"
                (click)="closeMenu()"
                >Registro</a
              >
            }
          </div>
        </div>
      </header>

      <main class="app-main">
        <router-outlet />
      </main>

      <footer class="site-footer">
        <div class="container">
          <span>© Bolera — pistas, zapatos y franjas</span>
          <span class="text-sm">Barniz de Arce · Europe/Madrid</span>
        </div>
      </footer>
    </div>
  `,
})
export class ShellComponent implements OnInit {
  public readonly auth = inject(AuthService);
  public readonly theme = inject(ThemeService);
  protected readonly menuOpen = signal(false);

  ngOnInit(): void {
    this.auth.bootstrap();
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
