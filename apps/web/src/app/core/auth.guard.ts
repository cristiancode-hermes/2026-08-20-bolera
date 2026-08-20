import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.getToken()) {
    return router.createUrlTree(['/login']);
  }

  if (!auth.user()) {
    try {
      const user = await lastValueFrom(auth.me());
      auth.setUser(user);
    } catch {
      auth.logout();
      return router.createUrlTree(['/login']);
    }
  }

  return true;
};

export function roleGuard(roles: Array<'player' | 'staff' | 'admin'>): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.getToken()) {
      return router.createUrlTree(['/login']);
    }

    if (!auth.user()) {
      try {
        const user = await lastValueFrom(auth.me());
        auth.setUser(user);
      } catch {
        auth.logout();
        return router.createUrlTree(['/login']);
      }
    }

    const role = auth.user()?.role;
    if (role && roles.includes(role)) {
      return true;
    }
    if (role === 'admin' && roles.includes('staff')) {
      return true;
    }
    return router.createUrlTree(['/']);
  };
}
