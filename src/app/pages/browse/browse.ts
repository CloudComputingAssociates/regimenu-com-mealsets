// src/app/pages/browse/browse.ts
// Public catalog grid. Fetches the catalog once into the shared signal store,
// overlays entitlements when the visitor is authenticated, and filters/sorts
// entirely client-side off the cached entries.
import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '@auth0/auth0-angular';
import { MealSetService } from '../../services/mealset.service';
import { MealSetCatalogEntry } from '../../models/mealset.models';
import { MealPlaceholderComponent } from '../../components/meal-placeholder/meal-placeholder';

type PriceFilter = 'all' | 'free' | 'paid';

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [RouterLink, MealPlaceholderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ms-container browse">
      <header class="browse__head">
        <h1 class="browse__title">Browse MealSets</h1>
        <p class="browse__sub">Chef-built meal packs, ready for your notebook.</p>
      </header>

      <!-- Price filter: conspicuous segmented control (client-side) -->
      <div class="seg" role="group" aria-label="Filter by price">
        <button class="seg__btn" [class.seg__btn--on]="priceFilter() === 'all'"
          (click)="priceFilter.set('all')">All</button>
        <button class="seg__btn seg__btn--free" [class.seg__btn--on]="priceFilter() === 'free'"
          (click)="priceFilter.set('free')">Free</button>
        <button class="seg__btn" [class.seg__btn--on]="priceFilter() === 'paid'"
          (click)="priceFilter.set('paid')">Paid</button>
      </div>

      <!-- Filters: genre chips (client-side) + name-sort toggle -->
      <div class="controls">
        <div class="chips" role="tablist" aria-label="Filter by genre">
          <button
            class="chip"
            [class.chip--on]="selectedGenre() === null"
            (click)="selectedGenre.set(null)">
            All
          </button>
          @for (g of svc.genres(); track g) {
            <button
              class="chip"
              [class.chip--on]="selectedGenre() === g"
              (click)="selectedGenre.set(g)">
              {{ g }}
            </button>
          }
        </div>
        <button class="sort" (click)="toggleSort()">
          Name {{ sortAsc() ? '▲ A–Z' : '▼ Z–A' }}
        </button>
      </div>

      @if (svc.loading() && !svc.loaded()) {
        <p class="state">Loading MealSets…</p>
      } @else if (svc.error()) {
        <p class="state state--err">{{ svc.error() }}</p>
      } @else if (visible().length === 0) {
        <p class="state">No MealSets match this filter.</p>
      } @else {
        <div class="grid">
          @for (entry of visible(); track entry.mealSetId) {
            <div class="card">
              <a class="card__link" [routerLink]="['/set', entry.mealSetId]">
                <div class="card__media">
                  @if (entry.mealSetPic1) {
                    <img class="card__img" [src]="entry.mealSetPic1" [alt]="entry.name" loading="lazy" />
                  } @else {
                    <app-meal-placeholder class="card__noimg" />
                  }
                  <!-- Free is called out with a conspicuous corner flag on the image -->
                  @if (entry.price === 0) {
                    <span class="flag-free">FREE</span>
                  }
                  @if (isOwned(entry.mealSetId)) {
                    <span class="badge badge--owned">✓ Purchased</span>
                  }
                </div>
                <div class="card__body">
                  <div class="card__titlerow">
                    <h2 class="card__name">
                      {{ entry.name }}@if (entry.mealCount != null) {
                        <span class="card__count">({{ entry.mealCount }})</span>
                      }
                    </h2>
                    <span class="card__price" [class.card__price--free]="entry.price === 0">
                      {{ priceLabel(entry.price) }}
                    </span>
                  </div>
                  @if (entry.authorName) {
                    <p class="card__author">by {{ entry.authorName }}</p>
                  }
                  @if (entry.genre) {
                    <span class="card__genre">{{ entry.genre }}</span>
                  }
                  @if (entry.description) {
                    <p class="card__desc">{{ entry.description }}</p>
                  }
                </div>
              </a>
              <div class="card__actions">
                <button
                  class="ms-btn ms-btn--primary card__cart"
                  [disabled]="isOwned(entry.mealSetId) || busyId() === entry.mealSetId"
                  (click)="addToCart(entry)">
                  {{ busyId() === entry.mealSetId ? 'Working…' : 'Add to Cart' }}
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './browse.scss',
})
export class BrowseComponent {
  protected svc = inject(MealSetService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private isAuthenticated = toSignal(this.auth.isAuthenticated$, { initialValue: false });

  readonly selectedGenre = signal<string | null>(null);
  readonly priceFilter = signal<PriceFilter>('all');
  readonly sortAsc = signal(true);
  /** mealSetId with an in-flight add-to-cart action (disables just that card). */
  readonly busyId = signal<number | null>(null);

  /** Entries after price + genre filters and name sort — all client-side. */
  readonly visible = computed<MealSetCatalogEntry[]>(() => {
    const genre = this.selectedGenre();
    const price = this.priceFilter();
    const asc = this.sortAsc();
    const list = this.svc
      .entries()
      .filter(e => (genre === null ? true : e.genre === genre))
      .filter(e =>
        price === 'all' ? true : price === 'free' ? e.price === 0 : e.price > 0,
      );
    return [...list].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return asc ? cmp : -cmp;
    });
  });

  constructor() {
    // One-shot public catalog load (cached in the store).
    this.svc.loadCatalog().subscribe({ error: () => {} });

    // When the visitor is (or becomes) authenticated, pull entitlements so the
    // grid can overlay "✓ Owned". Anonymous visitors never trigger this.
    effect(() => {
      if (this.isAuthenticated()) {
        this.svc.loadEntitled().subscribe({ error: () => {} });
      }
    });
  }

  isOwned(id: number): boolean {
    return this.isAuthenticated() && this.svc.entitledIds().has(id);
  }

  priceLabel(price: number): string {
    return price === 0 ? 'Free' : `$${price.toFixed(2)}`;
  }

  /**
   * Add-to-cart. There is no cart/multi-item checkout in the API, so this runs
   * the existing per-set flow: anon → login (returning to the set page), free →
   * acquire then pending, paid → Stripe checkout. 409 → already owned.
   */
  addToCart(e: MealSetCatalogEntry): void {
    if (this.isOwned(e.mealSetId) || this.busyId() !== null) return;

    if (!this.isAuthenticated()) {
      this.auth.loginWithRedirect({ appState: { target: `/set/${e.mealSetId}` } });
      return;
    }

    this.busyId.set(e.mealSetId);
    if (e.price === 0) {
      this.svc.acquire(e.mealSetId).subscribe({
        next: () => {
          this.busyId.set(null);
          void this.router.navigate(['/purchase/pending'], {
            queryParams: { setId: e.mealSetId },
          });
        },
        error: err => this.handleCartError(err),
      });
    } else {
      this.svc.checkout(e.mealSetId).subscribe({
        next: res => {
          if (res?.url) {
            window.location.href = res.url;
          } else {
            this.busyId.set(null);
          }
        },
        error: err => this.handleCartError(err),
      });
    }
  }

  /** 409 → already owned; refresh entitlements so the card flips to Purchased. */
  private handleCartError(err: unknown): void {
    this.busyId.set(null);
    if (err instanceof HttpErrorResponse && err.status === 409) {
      this.svc.loadEntitled().subscribe({ error: () => {} });
    }
  }

  toggleSort(): void {
    this.sortAsc.update(v => !v);
  }
}
