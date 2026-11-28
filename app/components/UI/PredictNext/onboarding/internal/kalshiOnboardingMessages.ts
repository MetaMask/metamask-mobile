import type { OnboardingMessage } from './kalshiDemoOnboardingMachine';

/**
 * Literal error copy for the demo onboarding and activation sheets.
 * Temporary slice: no locale entries.
 */
export const KALSHI_ONBOARDING_MESSAGES: Record<OnboardingMessage, string> = {
  generic: 'Something went wrong.',
  code_incorrect: "That code didn't work.",
  expired: 'Your link request expired. Start again.',
  signup_incomplete: 'Finish signing up on Kalshi demo first.',
  account_blocked: "This Kalshi account can't be linked.",
  new_account_failed:
    "We couldn't create a demo account for this email. Try an existing Kalshi demo account.",
  wallet_invalid: 'Kalshi demo rejected this wallet address.',
  rate_limited: 'Try again in a moment.',
  unsupported: "This account can't be linked in the demo flow.",
  review_timeout: 'Kalshi is still checking this account. Try again later.',
  activation_timeout:
    "We haven't confirmed your account yet. Check again in a moment.",
  demo_unavailable: "Demo sign-up isn't available right now.",
};
