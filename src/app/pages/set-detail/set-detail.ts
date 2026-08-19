// src/app/pages/set-detail/set-detail.ts
// Public per-set marketing page. Resolves the entry from the catalog store
// (fetches the catalog if this was a deep-link). Drives the acquire/checkout CTA
// per the client decision rule (price 0 → acquire, price > 0 → checkout) and the
// auth/ownership matrix.
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '@auth0/auth0-angular';
import { MealSetService } from '../../services/mealset.service';
import { MealSetCatalogEntry } from '../../models/mealset.models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-set-detail',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ms-container detail">
      @if (loading()) {
        <p class="state">Loading…</p>
      } @else if (!entry()) {
        <div class="state">
          <p>This MealSet could not be found.</p>
          <a routerLink="/browse" class="ms-btn ms-btn--ghost">Back to browse</a>
        </div>
      } @else if (entry(); as e) {
        <a routerLink="/browse" class="detail__back">← All MealSets</a>

        <div class="detail__grid">
          <!-- Gallery: pics 1–4 + optional video -->
          <div class="gallery">
            <div class="gallery__main">
              @if (activeMedia(); as m) {
                @if (m.kind === 'video') {
                  <video class="gallery__video" [src]="m.url" controls></video>
                } @else {
                  <img class="gallery__img" [src]="m.url" [alt]="e.name" />
                }
              } @else {
                <div class="gallery__noimg" aria-hidden="true">◈</div>
              }
            </div>
            @if (media().length > 1) {
              <div class="gallery__thumbs">
                @for (m of media(); track m.url; let i = $index) {
                  <button
                    class="thumb"
                    [class.thumb--on]="i === activeIndex()"
                    (click)="activeIndex.set(i)">
                    @if (m.kind === 'video') {
                      <span class="thumb__play">▶</span>
                    } @else {
                      <img [src]="m.url" alt="" />
                    }
                  </button>
                }
              </div>
            }
          </div>

          <!-- Info + CTA -->
          <div class="info">
            @if (e.genre) {
              <span class="info__genre">{{ e.genre }}</span>
            }
            <h1 class="info__name">{{ e.name }}</h1>
            @if (e.authorName) {
              <p class="info__by">by {{ e.authorName }}</p>
            }

            <div class="info__cta">
              @if (owned()) {
                <span class="owned-badge">✓ Owned</span>
                <a [href]="cockpitUrl" class="ms-btn ms-btn--primary">View in my binder</a>
              } @else {
                <span class="info__price" [class.info__price--free]="e.price === 0">
                  {{ priceLabel(e.price) }}
                </span>
                <button
                  class="ms-btn ms-btn--primary"
                  [disabled]="busy()"
                  (click)="onCta(e)">
                  {{ busy() ? 'Working…' : ctaLabel(e) }}
                </button>
              }
            </div>
            @if (errorMsg()) {
              <p class="info__err">{{ errorMsg() }}</p>
            }

            @if (e.description) {
              <p class="info__desc">{{ e.description }}</p>
            }
          </div>
        </div>

        <!-- Author block -->
        @if (e.authorName || e.authorBio || e.authorCredentials) {
          <section class="author">
            <h2 class="author__h">About the author</h2>
            <div class="author__row">
              @if (e.authorPic) {
                <img class="author__pic" [src]="e.authorPic" [alt]="e.authorName || 'Author'" />
              }
              <div class="author__text">
                @if (e.authorName) {
                  <p class="author__name">{{ e.authorName }}</p>
                }
                @if (e.authorCredentials) {
                  <p class="author__creds">{{ e.authorCredentials }}</p>
                }
                @if (e.authorBio) {
                  <p class="author__bio">{{ e.authorBio }}</p>
                }
                @if (e.backLink) {
                  <a class="author__link" [href]="e.backLink" target="_blank" rel="noopener">
                    @if (e.backLinkPhoto) {
                      <img class="author__linkpic" [src]="e.backLinkPhoto" alt="" />
                    }
                    More from this author →
                  </a>
                }
              </div>
            </div>
          </section>
        }
      }
    </div>
  `,
  styleUrl: './set-detail.scss',
})
export class SetDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(MealSetService);
  private auth = inject(AuthService);

  private isAuthenticated = toSignal(this.auth.isAuthenticated$, { initialValue: false });
  readonly cockpitUrl = environment.cockpitUrl;

  private readonly setId = signal<number>(NaN);
  readonly entry = signal<MealSetCatalogEntry | undefined>(undefined);
  readonly loading = signal(true);
  readonly owned = signal(false);
  readonly busy = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly activeIndex = signal(0);

  /** Ordered gallery media: pics 1–4 then video1. */
  readonly media = computed<{ kind: 'image' | 'video'; url: string }[]>(() => {
    const e = this.entry();
    if (!e) return [];
    const items: { kind: 'image' | 'video'; url: string }[] = [];
    for (const url of [e.mealSetPic1, e.mealSetPic2, e.mealSetPic3, e.mealSetPic4]) {
      if (url) items.push({ kind: 'image', url });
    }
    if (e.mealSetVideo1) items.push({ kind: 'video', url: e.mealSetVideo1 });
    return items;
  });
  readonly activeMedia = computed(() => this.media()[this.activeIndex()]);

  constructor() {
    // Resolve the id from the route (supports navigating between sets).
    this.route.paramMap.subscribe(pm => {
      const id = Number(pm.get('id'));
      this.setId.set(id);
      this.activeIndex.set(0);
      this.owned.set(false);
      this.errorMsg.set(null);

      if (!Number.isFinite(id)) {
        this.entry.set(undefined);
        this.loading.set(false);
        return;
      }

      // Seed instantly from the store if present, then confirm via resolve.
      this.entry.set(this.svc.peekEntry(id));
      this.loading.set(true);
      this.svc.getEntry(id).subscribe({
        next: e => {
          this.entry.set(e);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });

    // Check ownership whenever we have an id AND an authenticated session.
    effect(() => {
      const id = this.setId();
      if (this.isAuthenticated() && Number.isFinite(id)) {
        this.svc.isOwned(id).subscribe({
          next: v => this.owned.set(v),
          error: () => {},
        });
      }
    });
  }

  priceLabel(price: number): string {
    return price === 0 ? 'Free' : `$${price.toFixed(2)}`;
  }

  ctaLabel(e: MealSetCatalogEntry): string {
    return e.price === 0 ? 'Add to my binder' : 'Buy Now';
  }

  onCta(e: MealSetCatalogEntry): void {
    // Not authenticated → send to Auth0, returning to this page afterward.
    if (!this.isAuthenticated()) {
      this.auth.loginWithRedirect({ appState: { target: this.router.url } });
      return;
    }

    this.errorMsg.set(null);
    this.busy.set(true);

    if (e.price === 0) {
      // FREE → acquire, then land on the pending page.
      this.svc.acquire(e.mealSetId).subscribe({
        next: () => {
          this.busy.set(false);
          void this.router.navigate(['/purchase/pending'], {
            queryParams: { setId: e.mealSetId },
          });
        },
        error: err => this.handleAcquireError(err),
      });
    } else {
      // PAID → checkout, then redirect the browser to Stripe.
      this.svc.checkout(e.mealSetId).subscribe({
        next: res => {
          if (res?.url) {
            window.location.href = res.url;
          } else {
            this.busy.set(false);
            this.errorMsg.set('Checkout did not return a payment link. Please try again.');
          }
        },
        error: err => this.handleAcquireError(err),
      });
    }
  }

  /** 409 from acquire/checkout → already owned; flip to the owned state and
   *  refresh the authoritative flag. Other errors surface a message. */
  private handleAcquireError(err: unknown): void {
    this.busy.set(false);
    if (err instanceof HttpErrorResponse && err.status === 409) {
      this.owned.set(true);
      this.svc.isOwned(this.setId()).subscribe({
        next: v => this.owned.set(v),
        error: () => {},
      });
      return;
    }
    if (err instanceof HttpErrorResponse && err.status === 404) {
      this.errorMsg.set('This MealSet is no longer available.');
      return;
    }
    this.errorMsg.set('Something went wrong. Please try again.');
  }
}
