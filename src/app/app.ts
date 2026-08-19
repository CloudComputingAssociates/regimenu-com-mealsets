// src/app/app.ts
// Marketplace shell: a global header (logo, Browse, login/account) and footer
// wrap the routed pages. Standalone, signals, OnPush — mirrors regi-app.
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet, RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { environment } from '../environments/environment';
import { NotificationComponent } from './components/notification/notification';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NotificationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <header class="shell-header">
        <div class="ms-container shell-header__inner">
          <a routerLink="/" class="brand" aria-label="RegiMenu MealSets home">
            <img class="brand__logo" src="/images/yeh_logo_dark.png" alt="" />
            <span class="brand__name">RegiMenu MealSets</span>
          </a>
          <nav class="shell-nav">
            <a routerLink="/browse" class="shell-nav__link">Browse</a>
            @if (isAuthenticated()) {
              <button class="ms-btn ms-btn--ghost shell-nav__btn" (click)="logout()">
                Log out
              </button>
            } @else {
              <button class="ms-btn ms-btn--ghost shell-nav__btn" (click)="login()">
                Log in
              </button>
            }
          </nav>
        </div>
      </header>

      <main class="shell-main">
        <router-outlet />
      </main>

      <footer class="shell-footer">
        <div class="ms-container shell-footer__inner">
          <span class="shell-footer__brand">RegiMenu MealSets</span>
          <nav class="shell-footer__links">
            <a routerLink="/browse">Browse</a>
            <a [href]="signupUrl">Get the RegiMenu app</a>
          </nav>
        </div>
      </footer>

      <app-notification />
    </div>
  `,
  styleUrl: './app.scss',
})
export class AppComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly isAuthenticated = toSignal(this.auth.isAuthenticated$, { initialValue: false });
  readonly signupUrl = environment.signupUrl;

  constructor() {
    // After an Auth0 redirect completes, restore the page the user was on when
    // they triggered login. Guards and the set-detail CTA stash the return
    // target in appState.target.
    this.auth.appState$.subscribe((state: { target?: string } | undefined) => {
      if (state?.target) {
        void this.router.navigateByUrl(state.target);
      }
    });
  }

  login(): void {
    this.auth.loginWithRedirect({
      appState: { target: this.router.url },
    });
  }

  logout(): void {
    this.auth.logout({ logoutParams: { returnTo: window.location.origin } });
  }
}
