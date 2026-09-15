import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { ExportCredentialsIds } from '../../../app/components/Views/MultichainAccounts/AccountDetails/ExportCredentials.testIds';
import { RevealSeedViewSelectorsIDs } from '../../../app/components/Views/RevealPrivateCredential/RevealSeedView.testIds';
import { type AppiumElement } from '../../framework';

class ExportCredentials {
  get srpInfoContainer(): Promise<AppiumElement> {
    return Matchers.getElementByID(ExportCredentialsIds.CONTAINER);
  }

  get revealContainer(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID,
    );
  }

  get exportPrivateKeyButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ExportCredentialsIds.EXPORT_PRIVATE_KEY_BUTTON,
    );
  }

  get exportSrpButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(ExportCredentialsIds.EXPORT_SRP_BUTTON);
  }

  get passwordInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
    );
  }

  get nextButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(ExportCredentialsIds.NEXT_BUTTON);
  }

  get learnMoreButton(): Promise<AppiumElement> {
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
