import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import {
  asDetoxElement,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import { resolve } from '../../framework/Selector';
import UnifiedGestures from '../../framework/UnifiedGestures';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import { ImportSRPIDs } from '../../../app/components/Views/ImportNewSecretRecoveryPhrase/SRPImport.testIds';

class ImportSrpView {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(ImportSRPIDs.CONTAINER);
  }

  get title(): EncapsulatedElementType {
    return Matchers.getElementByID(ImportSRPIDs.SCREEN_TITLE_ID);
  }

  get importButton(): EncapsulatedElementType {
    return Matchers.getElementByID(ImportSRPIDs.IMPORT_BUTTON);
  }

  get textareaInput(): EncapsulatedElementType {
    return Matchers.getElementByID(ImportSRPIDs.SEED_PHRASE_INPUT_ID);
  }

  private getAppiumIosSeedPhraseXPath(index: number): string {
    if (index === 0) {
      return '//XCUIElementTypeOther[@name="textfield"]';
    }

    return `//XCUIElementTypeOther[@name="textfield" and @label="${index + 1}."]`;
  }

  seedPhraseInput(index: number): EncapsulatedElementType {
    const testID =
      index === 0
        ? ImportSRPIDs.SEED_PHRASE_INPUT_ID
        : `${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_${index}`;

    return resolve({
      detoxTestID: testID,
      androidAppiumTestID: testID,
      iosAppiumXPath: this.getAppiumIosSeedPhraseXPath(index),
    });
  }

  async tapTitle() {
    await Gestures.tap(this.title, {
      elemDescription: 'Import SRP screen title',
    });
  }

  async tapImportButton() {
    await Gestures.waitAndTap(this.importButton, {
      elemDescription: 'Import button',
    });
  }

  async enterSrp(mnemonic: string): Promise<void> {
    const srpArray = mnemonic.split(' ');

    await encapsulatedAction({
      detox: async () => {
        if (PlatformDetector.isIOS()) {
          for (const [i, word] of srpArray.entries()) {
            await Gestures.typeText(
              asDetoxElement(this.seedPhraseInput(i)),
              `${word} `,
              {
                elemDescription: 'Import SRP Secret Recovery Phrase Input Box',
                hideKeyboard: i === srpArray.length - 1,
              },
            );
          }
          await this.tapTitle();
          return;
        }

        await Gestures.replaceText(
          asDetoxElement(this.textareaInput),
          mnemonic,
          {
            elemDescription: 'SRP textarea input',
            checkVisibility: false,
          },
        );
      },
      appium: async () => {
        if (PlatformDetector.isAndroid()) {
          await UnifiedGestures.replaceText(this.seedPhraseInput(0), mnemonic, {
            description: 'Import SRP Secret Recovery Phrase Input Box',
          });
          return;
        }

        for (const [i, word] of srpArray.entries()) {
          const suffix = i === srpArray.length - 1 ? '' : ' ';
          await UnifiedGestures.typeText(
            this.seedPhraseInput(i),
            `${word}${suffix}`,
            {
              description: 'Import SRP Secret Recovery Phrase Input Box',
              waitForInteractive: true,
              postEnabledSettleMs: 500,
            },
          );
        }
        await PlaywrightGestures.hideKeyboard();
      },
    });
  }
}

export default new ImportSrpView();
