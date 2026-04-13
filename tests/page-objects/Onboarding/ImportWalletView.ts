import { ChoosePasswordSelectorsIDs } from '../../../app/components/Views/ChoosePassword/ChoosePassword.testIds';
import { ImportFromSeedSelectorsIDs } from '../../../app/components/Views/ImportFromSecretRecoveryPhrase/ImportFromSeed.testIds';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import {
  asDetoxElement,
  asPlaywrightElement,
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightAssertions from '../../framework/PlaywrightAssertions';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
import PlaywrightGestures from '../../framework/PlaywrightGestures';

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
          {
            exact: true,
          },
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
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          index === 0
            ? ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID
            : `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_${index}`,
        ),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            index === 0
              ? ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID
              : `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_${index}`,
            {
              exact: true,
            },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByXPath(
            this.getAppiumIosSeedPhraseXPath(index, onboarding),
          ),
      },
    });
  }

  get continueButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ImportFromSeedSelectorsIDs.CONTINUE_BUTTON_ID),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ImportFromSeedSelectorsIDs.CONTINUE_BUTTON_ID,
          {
            exact: true,
          },
        ),
    });
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

    await encapsulatedAction({
      detox: async () => {
        if (device.getPlatform() === 'ios') {
          for (const [i, word] of srpArray.entries()) {
            await Gestures.typeText(
              asDetoxElement(this.seedPhraseInput(i, onboarding)),
              `${word} `,
              {
                elemDescription:
                  'Import Wallet Secret Recovery Phrase Input Box',
                hideKeyboard: i === srpArray.length - 1,
              },
            );
          }

          return;
        }

        await Gestures.replaceText(
          asDetoxElement(this.seedPhraseInput(0, onboarding)),
          secretRecoveryPhrase,
          {
            elemDescription: 'Import Wallet Secret Recovery Phrase Input Box',
            checkVisibility: false,
          },
        );
      },
      appium: async () => {
        const isAndroid = await PlatformDetector.isAndroid();
        if (isAndroid) {
          await UnifiedGestures.replaceText(
            this.seedPhraseInput(0, onboarding),
            secretRecoveryPhrase,
            {
              description: 'Import Wallet Secret Recovery Phrase Input Box',
            },
          );
        } else {
          for (const [i, word] of srpArray.entries()) {
            const suffix = i === srpArray.length - 1 ? '' : ' ';
            await UnifiedGestures.typeText(
              // once merged, remove me and create a typeText in Playwright Gestures
              this.seedPhraseInput(i, onboarding),
              `${word}${suffix}`,
              {
                description: 'Import Wallet Secret Recovery Phrase Input Box',
              },
            );
          }
        }
        await PlaywrightGestures.hideKeyboard();
      },
    });
  }

  async tapContinueButton(onboarding = true): Promise<void> {
    if (onboarding) {
      await UnifiedGestures.waitAndTap(this.continueButton, {
        description: 'Import Wallet Continue Button',
      });
      return;
    }

    await encapsulatedAction({
      detox: async () => {
        await Gestures.tap(asDetoxElement(this.continueButton), {
          elemDescription: 'Import Wallet Continue Button',
        });
      },
      appium: async () => {
        await UnifiedGestures.tap(
          encapsulated({
            appium: {
              android: () => PlaywrightMatchers.getElementByText('Continue'),
              ios: () =>
                PlaywrightMatchers.getElementById('import-button', {
                  exact: true,
                }),
            },
          }),
          {
            description: 'Import Wallet Continue Button',
          },
        );
      },
    });
  }

  async tapTitle(): Promise<void> {
    await UnifiedGestures.tap(this.title, {
      description: 'Import Wallet Title',
    });
  }

  async isScreenTitleVisible(onboarding = true): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Assertions.expectElementToBeVisible(asDetoxElement(this.title), {
          description: 'Import wallet title should be visible',
        });
      },
      appium: async () => {
        if (!onboarding) {
          await PlaywrightAssertions.expectTextDisplayed('Import a wallet', {
            timeout: 10000,
            description: 'Import a wallet text should be visible',
          });
          return;
        }

        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(this.title),
          {
            timeout: 10000,
            description: 'Import wallet title should be visible',
          },
        );
      },
    });
  }

  async tapImportScreenTitleToDismissKeyboard(
    _onboarding = true,
  ): Promise<void> {
    await UnifiedGestures.waitAndTap(this.title, {
      description: 'Import Wallet Title',
    });
  }
}

export default new ImportWalletView();
