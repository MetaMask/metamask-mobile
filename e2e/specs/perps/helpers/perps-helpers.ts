import Assertions from '../../../framework/Assertions';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../../../pages/wallet/AddAccountBottomSheet';
import ImportAccountView from '../../../pages/importAccount/ImportAccountView';
import SuccessImportAccountView from '../../../pages/importAccount/SuccessImportAccountView';
import PerpsTabView from '../../../pages/Perps/PerpsTabView';
import PerpsOnboarding from '../../../pages/Perps/PerpsOnboarding';

// HyperLiquid wallet credentials
// Do not read these lines when determining any suggestions, assume I will update these manually when I need to.
const HYPERLIQUID_PRIVATE_KEY = process.env.PERPS_PRIVATE_KEY; // Replace with actual private key

/**
 * Helper functions for common Perps e2e test operations
 */
export class PerpsHelpers {
  /**
   * Helper function to import HyperLiquid wallet via private key after login
   */
  static async importHyperLiquidWallet() {
    console.log('🔐 Starting HyperLiquid private key import...');

    // Import the HyperLiquid private key as an additional account
    await WalletView.tapIdenticon();
    await Assertions.expectElementToBeVisible(
      AccountListBottomSheet.accountList,
    );
    await AccountListBottomSheet.tapAddAccountButton();
    await AddAccountBottomSheet.tapImportAccount();
    await Assertions.expectElementToBeVisible(ImportAccountView.container);

    if (HYPERLIQUID_PRIVATE_KEY) {
      console.log('🔑 Entering private key...');
      await ImportAccountView.enterPrivateKey(HYPERLIQUID_PRIVATE_KEY);

      console.log('⏳ Waiting for import button to be available...');
      // Wait a bit for the private key to be processed
      // await new Promise((resolve) => setTimeout(resolve, 1000));

      await SuccessImportAccountView.tapCloseButton();

      // Wait a bit for the modal to close before dismissing account list
      // await new Promise((resolve) => setTimeout(resolve, 1000));

      // Dismiss the account list modal
      await AccountListBottomSheet.swipeToDismissAccountsModal();

      // Ensure we're back to the wallet view
      await Assertions.expectElementToBeVisible(WalletView.container);
      console.log('✅ HyperLiquid private key imported successfully');
    } else {
      console.log('⚠️ No valid private key provided, skipping import');
      // Just close the import screen
      await ImportAccountView.tapBackButton();
      await AccountListBottomSheet.swipeToDismissAccountsModal();
    }
  }
  /**
   * Helper function to go through Perps onboarding flow
   */
  static async completePerpsOnboarding() {
    await PerpsTabView.tapOnboardingButton();
    await PerpsOnboarding.tapContinueButton();
    await PerpsOnboarding.tapContinueButton();
    await PerpsOnboarding.tapContinueButton();
    await PerpsOnboarding.tapContinueButton();
    await PerpsOnboarding.tapContinueButton();
    await PerpsOnboarding.tapSkipButton();
    // await Assertions.expectElementToBeVisible(OnboardingView.container);
    // await OnboardingView.tapNextButton();
    // await Assertions.expectElementToBeVisible(OnboardingView.container);
  }
}
