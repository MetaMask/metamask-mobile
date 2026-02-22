import { ChoosePasswordSelectorsIDs } from '../../../app/components/Views/ChoosePassword/ChoosePassword.testIds';
import { ImportFromSeedSelectorsIDs } from '../../../app/components/Views/ImportFromSecretRecoveryPhrase/ImportFromSeed.testIds';
import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';

class ImportWalletView {
  get container(): DetoxElement {
    return Matchers.getElementByID(ImportFromSeedSelectorsIDs.CONTAINER_ID);
  }

  get title(): DetoxElement {
    return Matchers.getElementByID(ImportFromSeedSelectorsIDs.SCREEN_TITLE_ID);
  }

  get newPasswordInput(): DetoxElement {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );
  }

  get confirmPasswordInput(): DetoxElement {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    );
  }

  seedPhraseInput(index: number): DetoxElement {
    if (index !== 0) {
      return Matchers.getElementByID(
        `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_${index}`,
      );
    }
    return Matchers.getElementByID(
      ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
    );
  }

  get continueButton(): DetoxElement {
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

  async enterSecretRecoveryPhrase(secretRecoveryPhrase: string): Promise<void> {
    if (device.getPlatform() === 'ios') {
      const srpArray = secretRecoveryPhrase.split(' ');
      for (const [i, word] of srpArray.entries()) {
        await Gestures.typeText(this.seedPhraseInput(i), `${word} `, {
          elemDescription: 'Import Wallet Secret Recovery Phrase Input Box',
          hideKeyboard: i === srpArray.length - 1,
        });
      }
    } else {
      await Gestures.replaceText(
        this.seedPhraseInput(0),
        secretRecoveryPhrase,
        {
          elemDescription: 'Import Wallet Secret Recovery Phrase Input Box',
          checkVisibility: false,
        },
      );
    }
  }

  async tapContinueButton(): Promise<void> {
    await Gestures.tap(this.continueButton, {
      elemDescription: 'Import Wallet Continue Button',
    });
  }

  async tapTitle(): Promise<void> {
    await Gestures.tap(this.title, {
      elemDescription: 'Import Wallet Title',
    });
  }
}

export default new ImportWalletView();
