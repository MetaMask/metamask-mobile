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
              ? `//XCUIElementTypeOther[@name="textfield" and @label="${index}."]`
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
   * Types a secret recovery phrase word-by-word into the SRP input fields.
   * Handles platform-specific field indexing:
   * - Android: fields indexed from 0 (seed-phrase-input-id_0, _1, ...)
   * - iOS: fields indexed from 1 via XPath labels ("1.", "2.", ...)
   * @param phrase - The secret recovery phrase to type
   * @param onboarding - Whether the screen is onboarding or not
   * @returns void
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
          // Type first word into the first field
          const firstField = await asPlaywrightElement(this.seedPhraseInput(0));
          await firstField.type(`${phraseArray[0]} `);

          // Type remaining words into indexed fields
          for (let i = 1; i < phraseArray.length; i++) {
            const fieldIndex = isAndroid ? i : i + 1;
            let input;
            if (isAndroid) {
              input = await PlaywrightMatchers.getElementById(
                `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_${fieldIndex}`,
              );
            } else {
              input = await PlaywrightMatchers.getElementByXPath(
                `//XCUIElementTypeOther[@name="textfield" and @label="${fieldIndex}."]`,
              );
            }
            await input.type(`${phraseArray[i]} `);
            await input.click();
          }
        } else {
          // Non-onboarding flow (adding additional SRP)
          let firstInput;
          if (isAndroid) {
            firstInput =
              await PlaywrightMatchers.getElementById('seed-phrase-input');
          } else {
            firstInput = await PlaywrightMatchers.getElementById('textfield');
          }
          await firstInput.type(`${phraseArray[0]} `);

          for (let i = 1; i < phraseArray.length; i++) {
            let input;
            if (isAndroid) {
              input = await PlaywrightMatchers.getElementById(
                `seed-phrase-input_${i}`,
              );
            } else {
              input = await PlaywrightMatchers.getElementByXPath(
                `//*[@label="${i + 1}."]`,
              );
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
