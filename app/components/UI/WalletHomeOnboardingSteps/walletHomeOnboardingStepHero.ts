import type { ImageSourcePropType } from 'react-native';
import walletHomeOnboardingAddFundsImage from '../../../images/wallet-home-onboarding-add-funds.png';
import walletHomeOnboardingTradeHeroImage from '../../../images/wallet-home-onboarding-trade.png';
import walletHomeOnboardingNotificationsHeroImage from '../../../images/wallet-home-onboarding-notifications.png';

/** Step kinds that show a hero illustration (kept in sync with WalletHomeOnboardingSteps). */
export type WalletHomeOnboardingStepHeroKind =
  | 'fund'
  | 'trade'
  | 'notifications';

export interface WalletHomeOnboardingStepHeroEntry {
  /**
   * Full-bleed hero background for the step (also used as the E2E static hero when Rive is off).
   */
  image: ImageSourcePropType;
}

/**
 * Per-step hero assets. In app builds the checklist uses Rive (`onboard_checklist_v05.riv`) on top of
 * this PNG background; in E2E the image is the only hero layer.
 */
export const WALLET_HOME_ONBOARDING_STEP_HERO: Record<
  WalletHomeOnboardingStepHeroKind,
  WalletHomeOnboardingStepHeroEntry
> = {
  fund: {
    image: walletHomeOnboardingAddFundsImage,
  },
  trade: {
    image: walletHomeOnboardingTradeHeroImage,
  },
  notifications: {
    image: walletHomeOnboardingNotificationsHeroImage,
  },
};
