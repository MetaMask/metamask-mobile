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
  /** Tailwind background for the hero card (design-token `accent*.light` → `bg-accent0*-light`). */
  heroBackgroundClassName: string;
}

/**
 * Central map for step hero assets and backgrounds.
 * In app builds the checklist hero uses Rive (`onboard_checklist_v05.riv`) artboards
 * `01_Add_Funds` / `02_First_Trade` / `03_Notifications` per step; these PNGs are the E2E
 * fallback (and when `isE2E`). Keep raster dimensions modest (on the order of hundreds of
 * px per side) so the app bundle stays lean. To change static fallbacks, edit `*.image` / `heroAccent`.
 */
export const WALLET_HOME_ONBOARDING_STEP_HERO: Record<
  WalletHomeOnboardingStepHeroKind,
  WalletHomeOnboardingStepHeroEntry
> = {
  fund: {
    image: walletHomeOnboardingAddFundsImage,
    heroAccent: 'accent04',
    heroBackgroundClassName: 'bg-accent04-light',
  },
  trade: {
    image: walletHomeOnboardingTradeHeroImage,
    heroAccent: 'accent03',
    heroBackgroundClassName: 'bg-accent03-light',
  },
  notifications: {
    image: walletHomeOnboardingNotificationsHeroImage,
    heroAccent: 'accent02',
    heroBackgroundClassName: 'bg-accent02-light',
  },
};
