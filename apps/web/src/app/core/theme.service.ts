import { Injectable, effect, signal } from '@angular/core';

const THEME_KEY = 'bolera_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(false);

  constructor() {
    let dark = false;
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === 'dark' || stored === 'light') {
        dark = stored === 'dark';
      } else if (typeof window !== 'undefined' && window.matchMedia) {
        dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
    } catch {
      dark = false;
    }
    this.isDark.set(dark);
    this.apply(dark);
    effect(() => this.apply(this.isDark()));
  }

  toggle(): void {
    this.isDark.update((v) => !v);
  }

  private apply(dark: boolean): void {
    const theme = dark ? 'dark' : 'light';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }
}
