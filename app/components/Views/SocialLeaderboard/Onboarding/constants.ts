/*
 * Branded onboarding surface colors live on a fixed purple gradient that is not
 * theme-background-aware, so they are intentionally hardcoded rather than mapped
 * to theme tokens. See `SocialLeaderboardOnboarding.styles.ts`.
 */
/* eslint-disable @metamask/design-tokens/color-no-hex */

/**
 * Artboard names for the Social Leaderboard onboarding Rive animation.
 *
 * The motion team delivers the `.riv` file(s) separately. Until then each slide
 * renders a static placeholder in its animation slot; wiring the real Rive
 * source + artboard names later is a localized change (see
 * `SocialLeaderboardOnboarding.tsx`). Mirrors `PERPS_RIVE_ARTBOARD_NAMES`.
 */
export enum SOCIAL_LEADERBOARD_ONBOARDING_ARTBOARD_NAMES {
  TRADE = '01_Trade',
  FOLLOW = '02_Follow',
  NOTIFY = '03_Notify',
}

/** Figma background: linear-gradient(180deg, #3D065F 0%, #8F44E4 100%) */
export const ONBOARDING_GRADIENT_COLORS = ['#3D065F', '#8F44E4'] as const;

/** Fixed surface colors for the branded gradient (not theme text tokens). */
export const ONBOARDING_COLORS = {
  onBrandText: '#FFFFFF',
  onBrandTextMuted: 'rgba(255, 255, 255, 0.75)',
  progressInactive: 'rgba(255, 255, 255, 0.25)',
  progressActive: '#FFFFFF',
  secondaryButtonBackground: 'rgba(255, 255, 255, 0.12)',
  animationSlot: 'rgba(255, 255, 255, 0.08)',
  cardBackground: 'rgba(0, 0, 0, 0.35)',
  cardBorder: 'rgba(255, 255, 255, 0.12)',
} as const;

/** Number of top traders surfaced on the "Follow the best" slide. */
export const ONBOARDING_TOP_TRADERS_LIMIT = 3;

/**
 * When `MM_SOCIAL_LEADERBOARD_ONBOARDING_SKIP_SEEN=true`, the onboarding is not
 * persisted as seen and Wallet home will navigate to it on every mount. For
 * local dev/QA only — remove or unset before release.
 */
export const isSocialLeaderboardOnboardingSkipSeen =
  process.env.MM_SOCIAL_LEADERBOARD_ONBOARDING_SKIP_SEEN === 'true';

export type OnboardingSlideId = 'trade' | 'follow' | 'notify';

/** Which variant of the final ("Never miss a move") slide to render. */
export type NotifySlideVariant = 'followed' | 'default';
