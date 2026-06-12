import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { ExportCredentialsIds } from '../../../app/components/Views/MultichainAccounts/AccountDetails/ExportCredentials.testIds';
import { RevealSeedViewSelectorsIDs } from '../../../app/components/Views/RevealPrivateCredential/RevealSeedView.testIds';

class ExportCredentials {
  get srpInfoContainer(): DetoxElement {
    return Matchers.getElementByID(ExportCredentialsIds.CONTAINER);
  }

  get revealContainer(): DetoxElement {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID,
    );
  }

  get exportPrivateKeyButton(): DetoxElement {
    return Matchers.getElementByID(
      ExportCredentialsIds.EXPORT_PRIVATE_KEY_BUTTON,
    );
  }

  get exportSrpButton(): DetoxElement {
    return Matchers.getElementByID(ExportCredentialsIds.EXPORT_SRP_BUTTON);
  }

  get passwordInput(): DetoxElement {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
    );
  }

  get nextButton(): DetoxElement {
    return Matchers.getElementByID(ExportCredentialsIds.NEXT_BUTTON);
  }

  get learnMoreButton(): DetoxElement {
    return Matchers.getElementByID(ExportCredentialsIds.LEARN_MORE_BUTTON);
  }

  async tapExportPrivateKeyButton(): Promise<void> {
    await Gestures.waitAndTap(this.exportPrivateKeyButton, {
      elemDescription: 'Export Private Key Button in Export Credentials',
    });
  }

  async tapExportSrpButton(): Promise<void> {
    await Gestures.waitAndTap(this.exportSrpButton, {
      elemDescription: 'Export SRP Button in Export Credentials',
    });
  }

  async enterPassword(password: string): Promise<void> {
    await Gestures.typeText(this.passwordInput, password, {
      elemDescription: 'Password Input in Export Credentials',
      hideKeyboard: true,
    });
  }

  async tapNextButton(): Promise<void> {
    await Gestures.waitAndTap(this.nextButton, {
      elemDescription: 'Next Button in Export Credentials',
    });
  }

  async tapLearnMoreButton(): Promise<void> {
    await Gestures.waitAndTap(this.learnMoreButton, {
      elemDescription: 'Learn More Button in Export Credentials',
    });
  }
}

export default new ExportCredentials();
