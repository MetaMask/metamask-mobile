import { AnimationDuration } from '@metamask/design-tokens';
import { Easing } from 'react-native-reanimated';

/**
 * Entrance timing for the referral funnel bars on the Rewards Performance
 * screen.
 *
 * `Easing.out(Easing.cubic)` is the app's established progress-fill curve —
 * the wallet-home onboarding checklist bar and the Perps deposit/withdrawal
 * bar both use it, so a funnel bar decelerates into its final width with the
 * same weight as every other bar in the product.
 */
export const REFERRAL_FUNNEL_FILL_TIMING = {
  duration: AnimationDuration.Slowly,
  easing: Easing.out(Easing.cubic),
};

/**
 * Gap between consecutive bars, so the rows read as a single top-to-bottom
 * wave rather than filling at once. Same cadence as the Money sheet entrance
 * wave.
 */
export const REFERRAL_FUNNEL_STAGGER_MS = 60;

/**
 * Held before the first bar starts. The screen is pushed from the right, and
 * without this the fill would play underneath the push and be over before the
 * screen settles.
 */
export const REFERRAL_FUNNEL_LEAD_IN_MS = AnimationDuration.Promptly;

/** Delay before the bar at `index` starts filling. */
export const referralFunnelFillDelay = (index: number): number =>
  REFERRAL_FUNNEL_LEAD_IN_MS + index * REFERRAL_FUNNEL_STAGGER_MS;
