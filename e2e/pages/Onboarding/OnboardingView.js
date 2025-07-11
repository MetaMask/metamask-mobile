import { OnboardingSelectorIDs } from '../../selectors/Onboarding/Onboarding.selectors';
import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';

class OnboardingView {
  get container() {
    return Matchers.getElementByID(OnboardingSelectorIDs.CONTAINER_ID);
  }

  get importSeedButton() {
    return Matchers.getElementByID(OnboardingSelectorIDs.IMPORT_SEED_BUTTON);
  }

  get newWalletButton() {
    return Matchers.getElementByID(OnboardingSelectorIDs.NEW_WALLET_BUTTON);
  }

  async tapCreateWallet() {
    await Gestures.waitAndTap(this.newWalletButton);
  }

  async tapImportWalletFromSeedPhrase() {
    await Gestures.waitAndTap(this.importSeedButton, {
      elemDescription: 'Onboarding Import Seed Phrase Button',
    });
  }
}

export default new OnboardingView();
