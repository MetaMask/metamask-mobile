import {
  ConfirmationRowComponentIDs,
  TransactionPayComponentIDs,
} from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import { getNetworkFilterTestId } from '../../../app/components/Views/confirmations/components/network-filter/network-filter.testIds';
import { TEXTFIELDSEARCH_TEST_ID } from '../../../app/component-library/components/Form/TextFieldSearch/TextFieldSearch.constants';
import enContent from '../../../locales/languages/en.json';
import {
  Assertions,
  FrameworkDetector,
  Matchers,
  PlatformDetector,
  PlaywrightAssertions,
  PlaywrightGestures,
  PlaywrightMatchers,
  UnifiedGestures,
  asDetoxElement,
  asPlaywrightElement,
  encapsulated,
  encapsulatedAction,
  getDriver,
  type EncapsulatedElementType,
} from '../../framework';

const TOKEN_SEARCH_PLACEHOLDER = enContent.send.search_tokens;
const ETHEREUM_NETWORK_FILTER_TEST_ID = getNetworkFilterTestId('0x1');

export function getKeypadKeyTestId(key: string): string {
  return key === '.' ? 'keypad-key-dot' : `keypad-key-${key}`;
}

class TransactionPayConfirmation {
  get bridgeTime(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ConfirmationRowComponentIDs.BRIDGE_TIME),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationRowComponentIDs.BRIDGE_TIME,
          {
            exact: true,
          },
        ),
    });
  }

  get keyboardContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TransactionPayComponentIDs.KEYBOARD_CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TransactionPayComponentIDs.KEYBOARD_CONTAINER,
          {
            exact: true,
          },
        ),
    });
  }
  get payWithRow(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ConfirmationRowComponentIDs.PAY_WITH),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationRowComponentIDs.PAY_WITH,
          {
            exact: true,
          },
        ),
    });
  }

  get payWithSymbol(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TransactionPayComponentIDs.PAY_WITH_SYMBOL),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TransactionPayComponentIDs.PAY_WITH_SYMBOL,
          {
            exact: true,
          },
        ),
    });
  }

  get payWithFiat(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TransactionPayComponentIDs.PAY_WITH_FIAT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TransactionPayComponentIDs.PAY_WITH_FIAT,
          {
            exact: true,
          },
        ),
    });
  }

  get payWithBalance(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TransactionPayComponentIDs.PAY_WITH_BALANCE),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TransactionPayComponentIDs.PAY_WITH_BALANCE,
          {
            exact: true,
          },
        ),
    });
  }

  get keyboardContinueButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          TransactionPayComponentIDs.KEYBOARD_CONTINUE_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TransactionPayComponentIDs.KEYBOARD_CONTINUE_BUTTON,
          {
            exact: true,
          },
        ),
    });
  }

  get amount(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(ConfirmationRowComponentIDs.AMOUNT),
      appium: () =>
        PlaywrightMatchers.getElementById(ConfirmationRowComponentIDs.AMOUNT, {
          exact: true,
        }),
    });
  }

  get total(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(ConfirmationRowComponentIDs.TOTAL),
      appium: () =>
        PlaywrightMatchers.getElementById(ConfirmationRowComponentIDs.TOTAL, {
          exact: true,
        }),
    });
  }

  get transactionFee(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ConfirmationRowComponentIDs.TRANSACTION_FEE),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationRowComponentIDs.TRANSACTION_FEE,
          {
            exact: true,
          },
        ),
    });
  }

  get payWithTokenList(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TransactionPayComponentIDs.PAY_WITH_TOKEN_LIST),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TransactionPayComponentIDs.PAY_WITH_TOKEN_LIST,
          {
            exact: true,
          },
        ),
    });
  }

  get tokenListScrollViewIdentifier(): Promise<Detox.NativeMatcher> {
    return Matchers.getIdentifier(
      TransactionPayComponentIDs.PAY_WITH_TOKEN_LIST,
    );
  }

  get tokenSearchInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(TEXTFIELDSEARCH_TEST_ID),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(TEXTFIELDSEARCH_TEST_ID, {
            exact: true,
          }),
        ios: () =>
          PlaywrightMatchers.getElementByCatchAll(TOKEN_SEARCH_PLACEHOLDER),
      },
    });
  }

  getTokenOptionAt(
    tokenSymbol: string,
    index: number,
  ): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(tokenSymbol, index),
      appium: async () => {
        const elements =
          await PlaywrightMatchers.getAllElementsByText(tokenSymbol);
        if (elements.length === 0) {
          throw new Error(
            `No pay with token option found for "${tokenSymbol}"`,
          );
        }
        if (index >= elements.length) {
          throw new Error(
            `Token index ${index} out of bounds (${elements.length} elements)`,
          );
        }
        return elements[index];
      },
    });
  }

  getFirstTokenOption(tokenSymbol: string): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(tokenSymbol, 0),
      appium: () => PlaywrightMatchers.getElementByCatchAll(tokenSymbol),
    });
  }

  getNetworkFilter(networkName: string): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(networkName),
      appium: () =>
        PlaywrightMatchers.getElementById(ETHEREUM_NETWORK_FILTER_TEST_ID, {
          exact: true,
        }),
    });
  }

  getKeypadButton(key: string): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(key),
      appium: () =>
        PlaywrightMatchers.getElementById(getKeypadKeyTestId(key), {
          exact: true,
        }),
    });
  }

  async expectText(
    elem: EncapsulatedElementType,
    text: string,
    description: string,
  ): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Assertions.expectElementToHaveText(asDetoxElement(elem), text, {
          description,
        });
      },
      appium: async () => {
        const resolved = await asPlaywrightElement(elem);
        const actualText = (await resolved.textContent())
          .replace(/\s+/gu, ' ')
          .trim();
        if (!actualText.includes(text)) {
          throw new Error(
            `${description}: expected text containing "${text}" but got "${actualText}"`,
          );
        }
      },
    });
  }

  async tapPayWithRow(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.payWithRow, {
      description: 'Pay With Row',
    });
  }

  async searchToken(tokenName: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await UnifiedGestures.typeText(this.tokenSearchInput, tokenName, {
          description: `Search token ${tokenName}`,
        });
      },
      appium: async () => {
        const searchField = await asPlaywrightElement(this.tokenSearchInput);
        await PlaywrightAssertions.expectElementToBeVisible(searchField, {
          timeout: 15000,
          description: 'Token search field should be visible',
        });
        await searchField.fill(tokenName);
      },
    });
  }

  async tapEthereumFilter(): Promise<void> {
    const ethereumFilter = this.getNetworkFilter('Ethereum');

    await encapsulatedAction({
      detox: async () => {
        await Assertions.expectElementToBeVisible(ethereumFilter, {
          description: 'Ethereum filter should be visible',
          timeout: 15000,
        });

        await UnifiedGestures.waitAndTap(ethereumFilter, {
          description: 'Ethereum Filter',
        });
      },
      appium: async () => {
        const resolvedFilter = await asPlaywrightElement(ethereumFilter);
        await PlaywrightAssertions.expectElementToBeVisible(resolvedFilter, {
          timeout: 15000,
          description: 'Ethereum filter should be visible',
        });

        if (await PlatformDetector.isIOS()) {
          await PlaywrightGestures.dblTap(resolvedFilter);
        } else {
          await PlaywrightGestures.waitAndTap(resolvedFilter, {
            checkForDisplayed: true,
            checkForEnabled: true,
          });
        }

        await PlaywrightGestures.waitForElementStable(resolvedFilter, {
          timeout: 3000,
          interval: 200,
          stableCount: 4,
        });
      },
    });
  }

  async tapFirstUsdc(tokenName: string): Promise<void> {
    const tokenElement = this.getFirstTokenOption(tokenName);

    await encapsulatedAction({
      detox: async () => {
        await UnifiedGestures.waitAndTap(tokenElement, {
          description: `First token ${tokenName}`,
        });
      },
      appium: async () => {
        const resolvedToken = await asPlaywrightElement(tokenElement);
        await PlaywrightAssertions.expectElementToBeVisible(resolvedToken, {
          timeout: 15000,
          description: `${tokenName} token should be visible`,
        });
        await PlaywrightGestures.waitAndTap(resolvedToken, {
          checkForDisplayed: true,
          checkForEnabled: true,
        });
      },
    });
  }

  async tapPayWithToken(tokenSymbol: string, index = 0): Promise<void> {
    const tokenElement = this.getTokenOptionAt(tokenSymbol, index);
    const opts = { description: `Pay With Token ${tokenSymbol}` };

    if (FrameworkDetector.isDetox()) {
      await UnifiedGestures.scrollToElement(
        tokenElement,
        this.tokenListScrollViewIdentifier,
        { ...opts, direction: 'down', scrollAmount: 200 },
      );
    }
    await UnifiedGestures.waitAndTap(tokenElement, opts);
  }

  async tapKeyboardContinueButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.keyboardContinueButton, {
      description: 'Keyboard Continue Button',
    });
  }

  async tapKeyboardAmount(amount: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        for (const char of amount) {
          await UnifiedGestures.waitAndTap(this.getKeypadButton(char), {
            description: `Keyboard Key ${char}`,
          });
        }
      },
      appium: async () => {
        for (const char of amount) {
          await PlaywrightGestures.waitAndTap(
            await asPlaywrightElement(this.getKeypadButton(char)),
            {
              checkForDisplayed: true,
              checkForEnabled: true,
            },
          );
        }
      },
    });
  }

  async enterAmountAndContinue(amount: string): Promise<void> {
    await this.tapKeyboardAmount(amount);
    await this.tapKeyboardContinueButton();
  }

  async verifyBridgeTime(time: string): Promise<void> {
    await this.expectText(
      this.bridgeTime,
      time,
      'Bridge time should be correct',
    );
  }

  async verifyAmount(amount: string): Promise<void> {
    await this.expectText(this.amount, amount, 'Amount should be correct');
  }

  async verifyTotal(total: string): Promise<void> {
    await this.expectText(this.total, total, 'Total should be correct');
  }

  async verifyTransactionFee(fee: string): Promise<void> {
    await this.expectText(
      this.transactionFee,
      fee,
      'Transaction fee should be correct',
    );
  }

  async verifyTransactionFeeVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.transactionFee, {
      description: 'Transaction fee row should be visible',
      timeout: 15000,
    });
  }
}

export default new TransactionPayConfirmation();
