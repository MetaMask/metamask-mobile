import type { ImageSourcePropType } from 'react-native';
import walletHomeOnboardingAddFundsImage from '../../../images/wallet-home-onboarding-add-funds.png';
import walletHomeOnboardingTradeHeroImage from '../../../images/wallet-home-onboarding-trade.png';
import walletHomeOnboardingNotificationsHeroImage from '../../../images/wallet-home-onboarding-notifications.png';

/** Step kinds that show a hero illustration (kept in sync with WalletHomeOnboardingSteps). */
export type WalletHomeOnboardingStepHeroKind =
  | 'fund'
  | 'trade'
  | 'notifications';

/**
 * Which theme accent palette’s `.light` swatch fills the hero area behind the image.
 * Matches `@metamask/design-tokens`.
 */
export type WalletHomeOnboardingHeroAccent =
  | 'accent03'
  | 'accent04'
  | 'accent02';

export interface WalletHomeOnboardingStepHeroEntry {
  image: ImageSourcePropType;
  heroAccent: WalletHomeOnboardingHeroAccent;
  heroHeight?: number; // px
}

/**
 * Central map for step hero assets and backgrounds. To use a different image for step 3,
 * change only `notifications.image` (and optionally `heroAccent`).
 */
export const WALLET_HOME_ONBOARDING_STEP_HERO: Record<
  WalletHomeOnboardingStepHeroKind,
  WalletHomeOnboardingStepHeroEntry
> = {
  fund: {
    image: walletHomeOnboardingAddFundsImage,
    heroAccent: 'accent04',
  },
  trade: {
    image: walletHomeOnboardingTradeHeroImage,
    heroAccent: 'accent03',
  },
  notifications: {
    image: walletHomeOnboardingNotificationsHeroImage,
    heroHeight: 148, // px
    heroAccent: 'accent02',
  },
};
