import { OnboardingSelectorIDs } from '../../selectors/Onboarding/Onboarding.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class OnboardingView {
  get container() {
    return Matchers.getElementByID(OnboardingSelectorIDs.CONTAINER_ID);
  }

  get importSeedButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(OnboardingSelectorIDs.IMPORT_SEED_BUTTON)
      : Matchers.getElementByID(OnboardingSelectorIDs.IMPORT_SEED_BUTTON);
  }

  get newWalletButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(OnboardingSelectorIDs.NEW_WALLET_BUTTON)
      : Matchers.getElementByID(OnboardingSelectorIDs.NEW_WALLET_BUTTON);
  }

  async tapCreateWallet() {
    await Gestures.waitAndTap(this.newWalletButton);
  }

  async tapImportWalletFromSeedPhrase() {
    await Gestures.waitAndTap(this.importSeedButton);
  }
}

export default new OnboardingView();
