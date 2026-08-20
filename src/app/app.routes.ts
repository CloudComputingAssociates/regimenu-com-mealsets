import { Routes } from '@angular/router';
import { authGuardFn } from '@auth0/auth0-angular';

// Route map for the public MealSets marketplace.
//  - Public (browsable anonymously): /, /browse, /set/:id
//  - Auth-required (authGuardFn → login redirect): /purchase/pending, /purchase/delivered
//  - 404 → /browse
//
// Titles are set per route and applied by Angular's built-in TitleStrategy.
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'MealSets — chef-built meal packs for your RegiMenu notebook',
    loadComponent: () => import('./pages/landing/landing').then(m => m.LandingComponent),
  },
  {
    path: 'browse',
    title: 'Browse MealSets — RegiMenu',
    loadComponent: () => import('./pages/browse/browse').then(m => m.BrowseComponent),
  },
  {
    path: 'set/:id',
    title: 'MealSet — RegiMenu',
    loadComponent: () => import('./pages/set-detail/set-detail').then(m => m.SetDetailComponent),
  },
  {
    path: 'purchase/pending',
    canActivate: [authGuardFn],
    title: 'Preparing your meals… — RegiMenu',
    loadComponent: () =>
      import('./pages/purchase-pending/purchase-pending').then(m => m.PurchasePendingComponent),
  },
  {
    path: 'purchase/delivered',
    canActivate: [authGuardFn],
    title: 'Meals added to your notebook — RegiMenu',
    loadComponent: () =>
      import('./pages/purchase-delivered/purchase-delivered').then(
        m => m.PurchaseDeliveredComponent,
      ),
  },
  // Unknown paths fall back to the catalog.
  { path: '**', redirectTo: 'browse' },
];
