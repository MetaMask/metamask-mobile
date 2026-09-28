import { ChoosePasswordSelectorsIDs } from '../../../app/components/Views/ChoosePassword/ChoosePassword.testIds';
import { ImportFromSeedSelectorsIDs } from '../../../app/components/Views/ImportFromSecretRecoveryPhrase/ImportFromSeed.testIds';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import type { AppiumElement } from '../../framework/AppiumElement';
import { PlatformDetector } from '../../framework/PlatformLocator';

class ImportWalletView {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(ImportFromSeedSelectorsIDs.CONTAINER_ID);
  }

  get title(): Promise<AppiumElement> {
    return Matchers.getElementByID(ImportFromSeedSelectorsIDs.SCREEN_TITLE_ID);
  }

  get newPasswordInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );
  }

  get confirmPasswordInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    );
  }

  seedPhraseInput(index: number, onboarding = true): Promise<AppiumElement> {
    // Onboarding uses phrase-input-id; post-onboarding uses seed-phrase-input.
    const seedPhraseInputPrefix = onboarding
      ? ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID
      : ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_FIELD;

    return Matchers.getElementByID(
      index === 0 ? seedPhraseInputPrefix : `${seedPhraseInputPrefix}_${index}`,
    );
  }

  get continueButton(): Promise<AppiumElement> {
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
    await Gestures.replaceText(
      this.seedPhraseInput(0, onboarding),
      secretRecoveryPhrase,
      {
        elemDescription: 'Import Wallet Secret Recovery Phrase Input Box',
        timeout: 15_000,
      },
    );
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

  get qrCodeButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ImportFromSeedSelectorsIDs.QR_CODE_BUTTON_ID,
    );
  }

  get importFromExtensionOption(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ImportFromSeedSelectorsIDs.IMPORT_FROM_EXTENSION_OPTION_ID,
    );
  }

  async tapImportFromExtensionLink(): Promise<void> {
    await Gestures.waitAndTap(this.qrCodeButton, {
      elemDescription: 'Import Wallet scan header button',
      timeout: 15_000,
    });
    await Gestures.waitAndTap(this.importFromExtensionOption, {
      elemDescription: 'Import from MetaMask extension option',
      timeout: 15_000,
    });
  }
}

export default new ImportWalletView();
