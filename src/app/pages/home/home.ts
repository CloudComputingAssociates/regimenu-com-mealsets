// src/app/pages/home/home.ts
// State-dependent landing at `/`:
//   - anonymous, OR authenticated with zero owned sets → LandingComponent pitch
//   - authenticated with ≥1 owned set → shelf view (slim browse band + My MealSets)
// While auth/entitled resolve, render a blank placeholder — never flash the
// pitch and then swap it out from under an owner.
import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { MealSetService } from '../../services/mealset.service';
import { LandingComponent } from '../landing/landing';
import { MyMealsetsComponent } from '../../components/my-mealsets/my-mealsets';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, LandingComponent, MyMealsetsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (view()) {
      @case ('pitch') {
        <app-landing />
      }
      @case ('shelf') {
        <div class="ms-container home">
          <!-- Slim salesy band — not a hero; the shelf is the star. -->
          <section class="band">
            <div class="band__copy">
              <h1 class="band__title">Hungry for new ideas?</h1>
              <p class="band__sub">
                Fresh, healthy mealsets from coaches, authors, chefs and Registered
                Dieticians — get more balanced meals to use in your weekly planning.
              </p>
            </div>
            <a routerLink="/browse" class="ms-btn ms-btn--primary band__cta">Browse MealSets</a>
          </section>

          <section class="my">
            <h2 class="my__title">My MealSets</h2>
            <app-my-mealsets />
          </section>
        </div>
      }
      @default {
        <!-- Resolving auth/entitlements — intentionally blank, no pitch flash. -->
        <div class="home-resolving" aria-hidden="true"></div>
      }
    }
  `,
  styleUrl: './home.scss',
})
export class HomeComponent {
  private auth = inject(AuthService);
  private svc = inject(MealSetService);

  private authLoading = toSignal(this.auth.isLoading$, { initialValue: true });
  private isAuthenticated = toSignal(this.auth.isAuthenticated$, { initialValue: false });
  private entitledResolved = signal(false);
  private started = false;

  readonly view = computed<'resolving' | 'pitch' | 'shelf'>(() => {
    if (this.authLoading()) return 'resolving';
    if (!this.isAuthenticated()) return 'pitch';
    if (!this.entitledResolved()) return 'resolving';
    return this.svc.entitled().length > 0 ? 'shelf' : 'pitch';
  });

  constructor() {
    // Once auth finishes loading, resolve entitlements exactly once. Reuse the
    // service cache if a prior page already loaded the entitled list.
    effect(() => {
      if (this.authLoading() || this.started) return;
      this.started = true;

      if (!this.isAuthenticated()) {
        this.entitledResolved.set(true);
        return;
      }
      if (this.svc.entitledLoaded()) {
        this.entitledResolved.set(true);
        return;
      }
      this.svc.loadEntitled().subscribe({
        next: () => this.entitledResolved.set(true),
        error: () => this.entitledResolved.set(true),
      });
    });
  }
}
