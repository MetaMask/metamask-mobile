import { SkipAccountSecurityModalSelectorsIDs } from '../../e2e/selectors/Onboarding/SkipAccountSecurityModal.selectors';
import { CommonScreen } from "./CommonScreen";

export class SkipAccountSecurityScreen extends CommonScreen {

  get skipBackupText() {
    return SkipAccountSecurityModalSelectorsIDs.ANDROID_SKIP_BACKUP_BUTTON_ID
  }

  async tapOnSkipBackup() {
    await this.tapOnElementByText('Skip');
  }

  async proceedWithoutWalletSecure() {
    await this.tapOnElement(this.skipBackupText);
    await this.tapOnSkipBackup();
  }

}