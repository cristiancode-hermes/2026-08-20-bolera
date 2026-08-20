import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <div class="container page">
      <div class="not-found">
        <div class="code">404</div>
        <h1>Página no encontrada</h1>
        <p class="text-muted">Esa ruta no existe en Bolera.</p>
        <a routerLink="/" class="btn btn-primary">Volver al inicio</a>
      </div>
    </div>
  `,
})
export class NotFoundPageComponent {}
