// src/app/pages/browse/browse.ts
// Public catalog grid. Fetches the catalog once into the shared signal store,
// overlays entitlements when the visitor is authenticated, and filters/sorts
// entirely client-side off the cached entries.
import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { MealSetService } from '../../services/mealset.service';
import { MealSetCatalogEntry } from '../../models/mealset.models';

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ms-container browse">
      <header class="browse__head">
        <h1 class="browse__title">Browse MealSets</h1>
        <p class="browse__sub">Chef-built meal packs, ready for your binder.</p>
      </header>

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
            <a class="card" [routerLink]="['/set', entry.mealSetId]">
              <div class="card__media">
                @if (entry.mealSetPic1) {
                  <img class="card__img" [src]="entry.mealSetPic1" [alt]="entry.name" loading="lazy" />
                } @else {
                  <div class="card__noimg" aria-hidden="true">◈</div>
                }
                @if (isOwned(entry.mealSetId)) {
                  <span class="badge badge--owned">✓ Owned</span>
                } @else {
                  <span class="badge badge--price" [class.badge--free]="entry.price === 0">
                    {{ priceLabel(entry.price) }}
                  </span>
                }
              </div>
              <div class="card__body">
                <h2 class="card__name">{{ entry.name }}</h2>
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
  private isAuthenticated = toSignal(this.auth.isAuthenticated$, { initialValue: false });

  readonly selectedGenre = signal<string | null>(null);
  readonly sortAsc = signal(true);

  /** Entries after genre filter + name sort — both client-side off the store. */
  readonly visible = computed<MealSetCatalogEntry[]>(() => {
    const genre = this.selectedGenre();
    const asc = this.sortAsc();
    const list = this.svc
      .entries()
      .filter(e => (genre === null ? true : e.genre === genre));
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

  toggleSort(): void {
    this.sortAsc.update(v => !v);
  }
}
