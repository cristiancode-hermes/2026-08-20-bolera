import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/home.page').then((m) => m.HomePageComponent),
      },
      {
        path: 'pistas',
        loadComponent: () =>
          import('./pages/lanes-catalogue.page').then((m) => m.LanesCataloguePageComponent),
      },
      {
        path: 'pistas/:id',
        loadComponent: () =>
          import('./pages/lane-detail.page').then((m) => m.LaneDetailPageComponent),
      },
      {
        path: 'pistas/:id/resena',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/review-form.page').then((m) => m.ReviewFormPageComponent),
      },
      {
        path: 'checkout/:slotId',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/checkout.page').then((m) => m.CheckoutPageComponent),
      },
      {
        path: 'reservas/:id/confirmacion',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/confirmation.page').then((m) => m.ConfirmationPageComponent),
      },
      {
        path: 'mis-partidas',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/my-bookings.page').then((m) => m.MyBookingsPageComponent),
      },
      {
        path: 'mis-partidas/:id',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/booking-detail.page').then((m) => m.BookingDetailPageComponent),
      },
      {
        path: 'staff',
        canActivate: [authGuard, roleGuard(['staff', 'admin'])],
        loadComponent: () =>
          import('./pages/staff-dashboard.page').then((m) => m.StaffDashboardPageComponent),
      },
      {
        path: 'staff/pistas',
        canActivate: [authGuard, roleGuard(['staff', 'admin'])],
        loadComponent: () =>
          import('./pages/lane-admin.page').then((m) => m.LaneAdminPageComponent),
      },
      {
        path: 'staff/franjas',
        canActivate: [authGuard, roleGuard(['staff', 'admin'])],
        loadComponent: () =>
          import('./pages/slot-admin.page').then((m) => m.SlotAdminPageComponent),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./pages/not-found.page').then((m) => m.NotFoundPageComponent),
      },
    ],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./pages/register.page').then((m) => m.RegisterPageComponent),
  },
];
