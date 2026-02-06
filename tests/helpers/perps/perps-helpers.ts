import WalletView from '../../../e2e/pages/wallet/WalletView';
import PerpsTabView from '../../../e2e/pages/Perps/PerpsTabView';
import PerpsOnboarding from '../../../e2e/pages/Perps/PerpsOnboarding';
import { createLogger, LogLevel } from '../../framework/logger';

const logger = createLogger({
  name: 'PerpsHelpers',
  level: LogLevel.INFO,
});

/**
 * Helper functions for common Perps e2e test operations
 */
export class PerpsHelpers {
  /**
   * Navigate to Perps tab with manual sync management (for when sync is disabled from launch)
   * Uses waitFor patterns instead of automatic synchronization
   */
  static async navigateToPerpsTab() {
    logger.info('[PerpsHelpers] Navigating to Perps tab...');
    // Navigate to Perps tab
    await WalletView.tapOnPerpsTab();
    logger.info('[PerpsHelpers] Perps tab loaded successfully');
  }

  /**
   * Helper function to go through Perps onboarding flow
   */
  static async completePerpsOnboarding() {
    logger.info('[PerpsHelpers] Completing Perps onboarding...');
    await PerpsTabView.tapOnboardingButton();
    await PerpsOnboarding.tapContinueButton();
    await PerpsOnboarding.tapContinueButton();
    await PerpsOnboarding.tapContinueButton();
    await PerpsOnboarding.tapContinueButton();
    await PerpsOnboarding.tapContinueButton();
    await PerpsOnboarding.tapSkipButton();
    logger.info('[PerpsHelpers] Perps onboarding completed successfully');
  }
}
