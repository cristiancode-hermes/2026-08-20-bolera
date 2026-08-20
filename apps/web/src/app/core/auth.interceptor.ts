import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'bolera_token';

/**
 * Reads JWT from localStorage only — never inject AuthService (NG0200 / cycle).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('/api/')) {
    let token: string | null = null;
    try {
      token = localStorage.getItem(TOKEN_KEY);
    } catch {
      token = null;
    }
    if (token) {
      return next(
        req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        }),
      );
    }
  }
  return next(req);
};
