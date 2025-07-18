import { OnboardingSelectorIDs } from '../../selectors/Onboarding/Onboarding.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class OnboardingView {
  get container(): DetoxElement {
    return Matchers.getElementByID(OnboardingSelectorIDs.CONTAINER_ID);
  }

  get importSeedButton(): DetoxElement {
    return Matchers.getElementByID(OnboardingSelectorIDs.IMPORT_SEED_BUTTON);
  }

  get newWalletButton(): DetoxElement {
    return Matchers.getElementByID(OnboardingSelectorIDs.NEW_WALLET_BUTTON);
  }

  async tapCreateWallet(): Promise<void> {
    await Gestures.waitAndTap(this.newWalletButton);
  }

  async tapImportWalletFromSeedPhrase(): Promise<void> {
    await Gestures.waitAndTap(this.importSeedButton, {
      elemDescription: 'Onboarding Import Seed Phrase Button',
    });
  }
}

export default new OnboardingView();
