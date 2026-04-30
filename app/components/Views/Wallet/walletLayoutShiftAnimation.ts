import { LayoutAnimation, Platform, UIManager } from 'react-native';
import { WALLET_HOME_POST_ONBOARDING_REVEAL_MS } from '../../UI/WalletHomeOnboardingSteps';

/**
 * Call immediately before a layout change that shifts Wallet main content (e.g. dismissing the
 * network connection banner) so the update eases instead of jumping. Uses the same duration as
 * the wallet-home post-onboarding homepage transition constant for consistency.
 */
export function configureWalletContentLayoutAnimation(): void {
  if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental
  ) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
  LayoutAnimation.configureNext({
    duration: WALLET_HOME_POST_ONBOARDING_REVEAL_MS,
    update: {
      type: LayoutAnimation.Types.easeInEaseOut,
    },
  });
}
