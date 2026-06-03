import Matchers from '../../framework/Matchers';
import { ExportCredentialsIds } from '../../../app/components/Views/MultichainAccounts/AccountDetails/ExportCredentials.testIds';
import { RevealSeedViewSelectorsIDs } from '../../../app/components/Views/RevealPrivateCredential/RevealSeedView.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class ExportCredentials {
  get srpInfoContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(ExportCredentialsIds.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(ExportCredentialsIds.CONTAINER),
    });
  }

  get revealContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID,
        ),
    });
  }

  get exportPrivateKeyButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ExportCredentialsIds.EXPORT_PRIVATE_KEY_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ExportCredentialsIds.EXPORT_PRIVATE_KEY_BUTTON,
        ),
    });
  }

  get exportSrpButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ExportCredentialsIds.EXPORT_SRP_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ExportCredentialsIds.EXPORT_SRP_BUTTON,
        ),
    });
  }

  get passwordInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
        ),
    });
  }

  get nextButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(ExportCredentialsIds.NEXT_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(ExportCredentialsIds.NEXT_BUTTON),
    });
  }

  get learnMoreButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ExportCredentialsIds.LEARN_MORE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ExportCredentialsIds.LEARN_MORE_BUTTON,
        ),
    });
  }

  async tapExportPrivateKeyButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.exportPrivateKeyButton, {
      elemDescription: 'Export Private Key Button in Export Credentials',
    });
  }

  async tapExportSrpButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.exportSrpButton, {
      elemDescription: 'Export SRP Button in Export Credentials',
    });
  }

  async enterPassword(password: string): Promise<void> {
    await UnifiedGestures.typeText(this.passwordInput, password, {
      elemDescription: 'Password Input in Export Credentials',
      hideKeyboard: true,
    });
  }

  async tapNextButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.nextButton, {
      elemDescription: 'Next Button in Export Credentials',
    });
  }

  async tapLearnMoreButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.learnMoreButton, {
      elemDescription: 'Learn More Button in Export Credentials',
    });
  }
}

export default new ExportCredentials();
