//import TestHelpers from '../../helpers';
import Gestures from '../Gestures';

import {
  ONBOARDING_SCREEN_CONTAINER_ID,
  CREATE_WALLET_BUTTON_ID,
  IMPORT_WALLET_BUTTON_ID,
} from '../../../test-ids';

//const importUsingSecretRecoveryPhrase = 'import-wallet-import-from-seed-button';
class OnboardingView {
  get onboardingViewContainer() {
    return $(`~${ONBOARDING_SCREEN_CONTAINER_ID}`);
  }

  async tapCreateWallet() {
    await Gestures.waitAndTap(CREATE_WALLET_BUTTON_ID);
  }

  async tapImportWalletFromSeedPhrase() {
    await Gestures.tap(IMPORT_WALLET_BUTTON_ID);
  }

  async isVisible() {
    await expect(this.onboardingViewContainer).toBeDisplayed();
  }

  async isNotVisible() {
    await expect(this.onboardingViewContainer).not.toBeDisplayed();
  }
}
export default new OnboardingView();
