import { ChoosePasswordSelectorsIDs } from '../../../app/components/Views/ChoosePassword/ChoosePassword.testIds';
import { ImportFromSeedSelectorsIDs } from '../../../app/components/Views/ImportFromSecretRecoveryPhrase/ImportFromSeed.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
  asDetoxElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { getDriver } from '../../framework/PlaywrightUtilities';
import { ImportSRPIDs } from '../../../app/components/Views/ImportNewSecretRecoveryPhrase/SRPImport.testIds';

class ImportWalletView {
  get container(): DetoxElement {
    return Matchers.getElementByID(ImportFromSeedSelectorsIDs.CONTAINER_ID);
  }

  get title(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ImportFromSeedSelectorsIDs.SCREEN_TITLE_ID),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ImportFromSeedSelectorsIDs.SCREEN_TITLE_ID,
        ),
    });
  }

  get continueButtonEncapsulated(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ImportFromSeedSelectorsIDs.CONTINUE_BUTTON_ID),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ImportFromSeedSelectorsIDs.CONTINUE_BUTTON_ID,
        ),
    });
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

  /**
   * Returns the encapsulated element for the SRP input field at the given word index.
   *
   * iOS label convention: the first field (index 0) has no label filter;
   * subsequent fields use 1-indexed labels offset by one from the word index
   * (word 1 → label "2.", word 2 → label "3.", etc.).
   * This matches the native iOS SRP form where the first labeled field is "2.".
   */
  seedPhraseInput(index: number): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        index !== 0
          ? Matchers.getElementByID(
              `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_${index}`,
            )
          : Matchers.getElementByID(
              ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
            ),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            index !== 0
              ? `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_${index}`
              : ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
          ),
        ios: () =>
          PlaywrightMatchers.getElementByXPath(
            index !== 0
              ? `//XCUIElementTypeOther[@name="textfield" and @label="${index + 1}."]`
              : '//XCUIElementTypeOther[@name="textfield"]',
          ),
      },
    });
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
    await encapsulatedAction({
      detox: async () => {
        if (device.getPlatform() === 'ios') {
          const srpArray = secretRecoveryPhrase.split(' ');
          for (const [i, word] of srpArray.entries()) {
            await Gestures.typeText(
              asDetoxElement(this.seedPhraseInput(i)),
              `${word} `,
              {
                elemDescription:
                  'Import Wallet Secret Recovery Phrase Input Box',
                hideKeyboard: i === srpArray.length - 1,
              },
            );
          }
        } else {
          await Gestures.replaceText(
            asDetoxElement(this.seedPhraseInput(0)),
            secretRecoveryPhrase,
            {
              elemDescription: 'Import Wallet Secret Recovery Phrase Input Box',
              checkVisibility: false,
            },
          );
        }
      },
    });
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

  // --- Appium-compatible methods (encapsulated) ---

  /**
   * Waits for the screen title to be visible
   * @param onboarding - Whether the screen is onboarding or not
   * @returns void
   */
  async isScreenTitleVisible(onboarding: boolean = true): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        if (onboarding) {
          const el = await asPlaywrightElement(this.title);
          await el.waitForDisplayed({ timeout: 10000 });
        } else {
          const el =
            await PlaywrightMatchers.getElementByText('Import a wallet');
          await el.waitForDisplayed({ timeout: 10000 });
        }
      },
    });
  }

  /**
   * Returns the input element for the given SRP index
   * @param srpIndex - The index of the SRP word
   * @param onboarding - Whether the screen is onboarding or not
   * @returns The input element for the given SRP index
   */
  async inputOfIndex(
    srpIndex: number,
    onboarding: boolean = true,
  ): Promise<string> {
    if (onboarding) {
      if (await PlatformDetector.isAndroid()) {
        return `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_${srpIndex}`;
      }
        return `//XCUIElementTypeOther[@name="textfield" and @label="${srpIndex}."]`;

    }
      if (await PlatformDetector.isAndroid()) {
        return `seed-phrase-input_${srpIndex}`;
      }
        return `//*[@label="${srpIndex + 1}."]`;


  }

  /**
   * Types a secret recovery phrase word-by-word into the SRP input fields.
   * Uses seedPhraseInput(i) for consistent selector resolution across platforms.
   *
   * Onboarding flow matches wdio ImportFromSeedScreen.typeSecretRecoveryPhrase:
   * - First word typed with trailing space into field 0
   * - Middle words typed with trailing space + tap into fields 1..n-2
   * - Last word typed WITHOUT trailing space into field n-1
   *
   * @param phrase - The secret recovery phrase to type
   * @param onboarding - Whether the screen is onboarding or not
   */
  async typeSecretRecoveryPhrase(
    phrase: string,
    onboarding: boolean = true,
  ): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const phraseArray = phrase.split(' ');
        const isAndroid = await PlatformDetector.isAndroid();

        if (onboarding) {
          // Type first word into the first field (with trailing space)
          const firstField = await asPlaywrightElement(this.seedPhraseInput(0));
          await firstField.type(`${phraseArray[0]} `);

          // Type middle words (with trailing space + tap)
          for (let i = 1; i < phraseArray.length - 1; i++) {
            const input = await asPlaywrightElement(this.seedPhraseInput(i));
            await input.type(`${phraseArray[i]} `);
            await input.click();
          }

          // Type last word (without trailing space, no tap)
          const lastIndex = phraseArray.length - 1;
          const lastInput = await asPlaywrightElement(
            this.seedPhraseInput(lastIndex),
          );
          await lastInput.type(phraseArray[lastIndex]);
        } else {
          // Non-onboarding flow (adding additional SRP)
          let firstInput;
          if (isAndroid) {
            firstInput = await PlaywrightMatchers.getElementById(
              ImportSRPIDs.SEED_PHRASE_INPUT_ID,
            );
          } else {
            firstInput = await PlaywrightMatchers.getElementById('textfield');
          }
          await firstInput.type(`${phraseArray[0]} `);

          for (let i = 1; i < phraseArray.length; i++) {
            const fieldId = await this.inputOfIndex(i, false);
            let input;
            if (isAndroid) {
              input = await PlaywrightMatchers.getElementById(fieldId);
            } else {
              input = await PlaywrightMatchers.getElementByXPath(fieldId);
            }
            await input.type(`${phraseArray[i]} `);
            await input.click();
          }
        }
      },
    });
  }

  async tapImportScreenTitleToDismissKeyboard(
    onboarding: boolean = true,
  ): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        if (onboarding) {
          const el = await asPlaywrightElement(this.title);
          await el.click();
        } else {
          const drv = getDriver();
          await drv.hideKeyboard();
        }
      },
    });
  }

  async tapContinueButtonForOnboarding(
    onboarding: boolean = true,
  ): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        if (onboarding) {
          const drv = getDriver();
          await drv.hideKeyboard();
          const el = await asPlaywrightElement(this.continueButtonEncapsulated);
          await el.click();
        } else {
          const isIOS = await PlatformDetector.isIOS();
          if (isIOS) {
            const el = await PlaywrightMatchers.getElementById('import-button');
            await el.click();
          } else {
            const el = await PlaywrightMatchers.getElementByText('Continue');
            await el.click();
          }
        }
      },
    });
  }
}

export default new ImportWalletView();
