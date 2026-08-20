// src/app/pages/landing/landing.ts
// Public landing page — typography-led, one clean screen. Hero + three-step
// value strip + primary CTA into /browse.
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero">
      <div class="ms-container hero__inner">
        <p class="hero__eyebrow">The RegiMenu marketplace</p>
        <h1 class="hero__title">
          MealSets — chef-built, macro-true<br />meal packs for your RegiMenu notebook.
        </h1>
        <p class="hero__sub">
          Curated packs of real meals with real macros, built by chefs and coaches.
          Add a set to your notebook and it is ready to plan against in seconds.
        </p>
        <div class="hero__cta">
          <a routerLink="/browse" class="ms-btn ms-btn--primary hero__btn">Browse MealSets</a>
        </div>
      </div>
    </section>

    <section class="steps">
      <div class="ms-container steps__grid">
        <div class="step">
          <span class="step__num">1</span>
          <h3 class="step__title">Browse</h3>
          <p class="step__body">
            Explore chef-built meal packs by genre — from cutting to bulking to
            plant-forward. Every macro is already dialed in.
          </p>
        </div>
        <div class="step">
          <span class="step__num">2</span>
          <h3 class="step__title">Add to your notebook</h3>
          <p class="step__body">
            Free sets drop straight into your notebook. Paid packs check out in one
            step and land the moment payment clears.
          </p>
        </div>
        <div class="step">
          <span class="step__num">3</span>
          <h3 class="step__title">Plan your week</h3>
          <p class="step__body">
            Your new meals are instantly available in the RegiMenu app to schedule,
            swap, and track against your targets.
          </p>
        </div>
      </div>
    </section>
  `,
  styleUrl: './landing.scss',
})
export class LandingComponent {}
