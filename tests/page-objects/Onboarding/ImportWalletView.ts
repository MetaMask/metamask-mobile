import { ChoosePasswordSelectorsIDs } from '../../../app/components/Views/ChoosePassword/ChoosePassword.testIds';
import { ImportFromSeedSelectorsIDs } from '../../../app/components/Views/ImportFromSecretRecoveryPhrase/ImportFromSeed.testIds';
import enContent from '../../../locales/languages/en.json';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';
import { PlatformDetector } from '../../framework/PlatformLocator';

class ImportWalletView {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(ImportFromSeedSelectorsIDs.CONTAINER_ID);
  }

  get title(): EncapsulatedElementType {
    return Matchers.getElementByID(ImportFromSeedSelectorsIDs.SCREEN_TITLE_ID);
  }

  get newPasswordInput(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );
  }

  get confirmPasswordInput(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    );
  }

  getAppiumIosSeedPhraseXPath(index: number, onboarding = true): string {
    if (onboarding) {
      if (index === 0) {
        return '//XCUIElementTypeOther[@name="textfield"]';
      }

      return `//XCUIElementTypeOther[@name="textfield" and @label="${index + 1}."]`;
    }

    if (index === 0) {
      return "//*[@name='textfield' or @label='textfield']";
    }

    return `//*[@label="${index + 1}."]`;
  }

  seedPhraseInput(index: number, onboarding = true): EncapsulatedElementType {
    // Onboarding ImportFromSecretRecoveryPhrase uses phrase-input-id;
    // post-onboarding ImportNewSecretRecoveryPhrase uses seed-phrase-input.
    const androidSeedPhraseInputPrefix = onboarding
      ? ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID
      : ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_FIELD;

    if (PlatformDetector.isAndroid()) {
      return Matchers.getElementByID(
        index === 0
          ? androidSeedPhraseInputPrefix
          : `${androidSeedPhraseInputPrefix}_${index}`,
      );
    }

    return Matchers.getElementByNativeXPath(
      this.getAppiumIosSeedPhraseXPath(index, onboarding),
    );
  }

  get continueButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ImportFromSeedSelectorsIDs.CONTINUE_BUTTON_ID,
    );
  }

  async enterPassword(password: string): Promise<void> {
    await Gestures.typeText(this.newPasswordInput, password, {
      hideKeyboard: true,
    });
  }

  async reEnterPassword(password: string): Promise<void> {
    await Gestures.typeText(this.confirmPasswordInput, password, {
      hideKeyboard: true,
    });
  }

  async enterSecretRecoveryPhrase(
    secretRecoveryPhrase: string,
    onboarding = true,
  ): Promise<void> {
    await this.typeSecretRecoveryPhrase(secretRecoveryPhrase, onboarding);
  }

  async typeSecretRecoveryPhrase(
    secretRecoveryPhrase: string,
    onboarding = true,
  ): Promise<void> {
    const srpArray = secretRecoveryPhrase.split(' ');

    // Android: replaceText does not leave the soft keyboard open;
    // hideKeyboard() throws on Android when none is visible (unlike iOS).
    if (PlatformDetector.isAndroid()) {
      await Gestures.replaceText(
        this.seedPhraseInput(0, onboarding),
        secretRecoveryPhrase,
        {
          elemDescription: 'Import Wallet Secret Recovery Phrase Input Box',
          timeout: 15_000,
        },
      );
      return;
    }

    for (const [i, word] of srpArray.entries()) {
      await Gestures.typeText(this.seedPhraseInput(i, onboarding), `${word} `, {
        elemDescription: 'Import Wallet Secret Recovery Phrase Input Box',
        hideKeyboard: false,
      });
    }
    await this.tapImportScreenTitleToDismissKeyboard(onboarding);
    await Gestures.hideKeyboard();
  }

  async tapContinueButton(onboarding = true): Promise<void> {
    if (onboarding) {
      // iOS only — Android replaceText path already has no keyboard.
      if (!PlatformDetector.isAndroid()) {
        await Gestures.hideKeyboard();
      }
      await Gestures.waitAndTap(this.continueButton, {
        elemDescription: 'Import Wallet Continue Button',
        timeout: 15_000,
        checkForDisplayed: true,
        checkEnabled: true,
      });
      return;
    }

    if (!PlatformDetector.isAndroid()) {
      await Gestures.hideKeyboard();
    }

    if (PlatformDetector.isAndroid()) {
      await Gestures.tap(Matchers.getElementByText('Continue'), {
        elemDescription: 'Import Wallet Continue Button',
      });
      return;
    }

    await Gestures.tap(Matchers.getElementByID('import-button'), {
      elemDescription: 'Import Wallet Continue Button',
    });
  }

  async tapTitle(): Promise<void> {
    await Gestures.tap(this.title, {
      elemDescription: 'Import Wallet Title',
    });
  }

  async isScreenTitleVisible(onboarding = true): Promise<void> {
    if (!onboarding) {
      await Assertions.expectTextDisplayed('Import a wallet', {
        timeout: 10000,
        description: 'Import a wallet text should be visible',
      });
      return;
    }

    await Assertions.expectElementToBeVisible(this.title, {
      timeout: 10000,
      description: 'Import wallet title should be visible',
    });
  }

  async tapImportScreenTitleToDismissKeyboard(
    _onboarding = true,
  ): Promise<void> {
    await Gestures.waitAndTap(this.title, {
      elemDescription: 'Import Wallet Title',
    });
  }

  get importFromExtensionLink(): EncapsulatedElementType {
    return Matchers.getElementByText(
      enContent.import_from_seed.import_wallet_from_extension,
    );
  }

  async tapImportFromExtensionLink(): Promise<void> {
    await Gestures.waitAndTap(this.importFromExtensionLink, {
      elemDescription: 'Import from MetaMask extension link',
      timeout: 15_000,
    });
  }
}

export default new ImportWalletView();
