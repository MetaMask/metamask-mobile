import { ChoosePasswordSelectorsIDs } from '../../selectors/Onboarding/ChoosePassword.selectors';
import { ImportFromSeedSelectorsIDs } from '../../selectors/Onboarding/ImportFromSeed.selectors';
import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';

class ImportWalletView {
  get container() {
    return Matchers.getElementByID(ImportFromSeedSelectorsIDs.CONTAINER_ID);
  }

  get title() {
    return Matchers.getElementByID(ImportFromSeedSelectorsIDs.SCREEN_TITLE_ID);
  }

  get newPasswordInput() {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );
  }

  get confirmPasswordInput() {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    );
  }

  get seedPhraseInput() {
    return Matchers.getElementByID(
      ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
    );
  }

  get continueButton() {
    return Matchers.getElementByID(
      ImportFromSeedSelectorsIDs.CONTINUE_BUTTON_ID,
    );
  }

  async enterPassword(password) {
    await Gestures.typeText(this.newPasswordInput, password, {
      elemDescription: 'New Password Input',
      hideKeyboard: true,
    });
  }

  async reEnterPassword(password) {
    await Gestures.typeText(this.confirmPasswordInput, password, {
      hideKeyboard: true,
      elemDescription: 'Confirm Password Input',
    });
  }

  async enterSecretRecoveryPhrase(secretRecoveryPhrase) {
    const words = secretRecoveryPhrase.trim().split(/\s+/);

    for (let i = 0; i < words.length; i++) {
      let wordInput;
      if (i === 0) {
        wordInput = this.seedPhraseInput;
      } else {
        wordInput = Matchers.getElementByID(
          `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_${i}`,
        );
      }

      const elemDescription = `Seed Phrase Input ${i + 1}`;
      if (i !== 11) {
        await Gestures.typeText(wordInput, words[i] + ' ', {
          hideKeyboard: true,
          elemDescription,
          sensitive: true,
        });
      } else {
        await Gestures.typeText(wordInput, words[i], {
          hideKeyboard: true,
          elemDescription,
          sensitive: true,
        });
      }
    }
  }

  async clearSecretRecoveryPhraseInputBox() {
    await Gestures.clearField(this.seedPhraseInput);
  }

  async tapContinueButton() {
    await Gestures.tap(this.continueButton);
  }

  async tapTitle() {
    await Gestures.tap(this.title);
  }
}

export default new ImportWalletView();
