import { Routes } from '@angular/router';
import { authGuardFn } from '@auth0/auth0-angular';

// Route map for the public MealSets marketplace.
//  - Public (browsable anonymously): /, /browse, /set/:id
//  - Auth-required (authGuardFn → login redirect): /purchase/pending, /purchase/delivered
//  - 404 → /browse
//
// The browser tab reads "mealsets.RegiMenu.com" on every route (applied by
// Angular's built-in TitleStrategy), paired with the RegiMenu logo favicon.
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'mealsets.RegiMenu.com',
    loadComponent: () => import('./pages/landing/landing').then(m => m.LandingComponent),
  },
  {
    path: 'browse',
    title: 'mealsets.RegiMenu.com',
    loadComponent: () => import('./pages/browse/browse').then(m => m.BrowseComponent),
  },
  {
    path: 'set/:id',
    title: 'mealsets.RegiMenu.com',
    loadComponent: () => import('./pages/set-detail/set-detail').then(m => m.SetDetailComponent),
  },
  {
    path: 'purchase/pending',
    canActivate: [authGuardFn],
    title: 'mealsets.RegiMenu.com',
    loadComponent: () =>
      import('./pages/purchase-pending/purchase-pending').then(m => m.PurchasePendingComponent),
  },
  {
    path: 'purchase/delivered',
    canActivate: [authGuardFn],
    title: 'mealsets.RegiMenu.com',
    loadComponent: () =>
      import('./pages/purchase-delivered/purchase-delivered').then(
        m => m.PurchaseDeliveredComponent,
      ),
  },
  // Unknown paths fall back to the catalog.
  { path: '**', redirectTo: 'browse' },
];
