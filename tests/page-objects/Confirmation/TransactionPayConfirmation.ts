import {
  ConfirmationRowComponentIDs,
  TransactionPayComponentIDs,
} from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import {
  Assertions,
  FrameworkDetector,
  Matchers,
  PlaywrightMatchers,
  UnifiedGestures,
  asDetoxElement,
  asPlaywrightElement,
  encapsulated,
  encapsulatedAction,
  type EncapsulatedElementType,
} from '../../framework';

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

  private getTokenOptionAt(
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

  private getKeypadButton(key: string): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(key),
      appium: () => PlaywrightMatchers.getElementByText(key),
    });
  }

  private async expectText(
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

  async isAmountEntryVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.keyboardContinueButton, {
      description: 'Transaction pay keyboard continue button',
      timeout: 15000,
    });
  }

  async isPayWithTokenListVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.payWithTokenList, {
      description: 'Pay with token list',
      timeout: 15000,
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
    for (const char of amount) {
      await UnifiedGestures.waitAndTap(this.getKeypadButton(char), {
        description: `Keyboard Key ${char}`,
      });
    }
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
