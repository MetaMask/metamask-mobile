import {
  ConfirmationRowComponentIDs,
  PayWithBottomSheetIDs,
  TransactionPayComponentIDs,
} from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import { getAssetTestId } from '../../../app/components/UI/AssetElement/AssetElement.testIds';
import { getNetworkFilterTestId } from '../../../app/components/Views/confirmations/components/network-filter/network-filter.testIds';
import { TEXTFIELDSEARCH_TEST_ID } from '../../../app/component-library/components/Form/TextFieldSearch/TextFieldSearch.constants';
import enContent from '../../../locales/languages/en.json';
import {
  Assertions,
  Gestures,
  Matchers,
  PlatformDetector,
  Utilities,
  sleep,
  type AppiumElement,
} from '../../framework';

const TOKEN_SEARCH_PLACEHOLDER = enContent.send.search_tokens;
const ETHEREUM_NETWORK_FILTER_TEST_ID = getNetworkFilterTestId('0x1');
const ARBITRUM_NETWORK_FILTER_TEST_ID = getNetworkFilterTestId('0xa4b1');

export function getKeypadKeyTestId(key: string): string {
  return key === '.' ? 'keypad-key-dot' : `keypad-key-${key}`;
}

class TransactionPayConfirmation {
  get bridgeTime(): Promise<AppiumElement> {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.BRIDGE_TIME);
  }

  get keypad(): Promise<AppiumElement> {
    return Matchers.getElementByID(TransactionPayComponentIDs.KEYPAD);
  }

  async expectKeyboardLoaded(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.keypad, {
      description: 'Deposit keyboard exists',
      timeout: 30000,
    });
  }

  async expectPayWithRowLoaded(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.payWithRow, {
      description: 'Pay with row should finish loading',
      timeout: 15000,
    });
  }

  async focusAmountInput(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.keypad, {
      description: 'Deposit keyboard is visible before typing amount',
    });
    await Gestures.waitAndTap(this.keypad, {
      elemDescription: 'Focus amount via deposit keyboard container',
      checkEnabled: false,
      checkVisibility: false,
    });
  }

  async typeAmount(amount: string): Promise<void> {
    await this.tapKeyboardAmount(amount);
  }

  async tapContinue(): Promise<void> {
    await this.tapKeyboardContinueButton();
  }

  get keyboardContainer(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      TransactionPayComponentIDs.KEYBOARD_CONTAINER,
    );
  }

  get payWithRow(): Promise<AppiumElement> {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.PAY_WITH);
  }

  get payWithSymbol(): Promise<AppiumElement> {
    return Matchers.getElementByID(TransactionPayComponentIDs.PAY_WITH_SYMBOL);
  }

  get payWithFiat(): Promise<AppiumElement> {
    return Matchers.getElementByID(TransactionPayComponentIDs.PAY_WITH_FIAT);
  }

  get payWithBalance(): Promise<AppiumElement> {
    return Matchers.getElementByID(TransactionPayComponentIDs.PAY_WITH_BALANCE);
  }

  get keyboardContinueButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      TransactionPayComponentIDs.KEYBOARD_CONTINUE_BUTTON,
    );
  }

  get amount(): Promise<AppiumElement> {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.AMOUNT);
  }

  get total(): Promise<AppiumElement> {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.TOTAL);
  }

  get receive(): Promise<AppiumElement> {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.RECEIVE);
  }

  get availableBalance(): Promise<AppiumElement> {
    return Matchers.getElementByText('Available balance');
  }

  get transactionFee(): Promise<AppiumElement> {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.TRANSACTION_FEE);
  }

  get payWithTokenList(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      TransactionPayComponentIDs.PAY_WITH_TOKEN_LIST,
    );
  }

  // iOS: match search placeholder text; Android: use testID.
  get tokenSearchInput(): Promise<AppiumElement> {
    if (PlatformDetector.isIOS()) {
      return Matchers.getElementByNativeXPath(
        `//*[contains(@name,'${TOKEN_SEARCH_PLACEHOLDER}') or contains(@label,'${TOKEN_SEARCH_PLACEHOLDER}') or contains(@text,'${TOKEN_SEARCH_PLACEHOLDER}')]`,
      );
    }
    return Matchers.getElementByID(TEXTFIELDSEARCH_TEST_ID);
  }

  getTokenBySymbol(symbol: string): Promise<AppiumElement> {
    return Matchers.getElementByID(getAssetTestId(symbol));
  }

  getTokenOptionAt(tokenSymbol: string, index: number): Promise<AppiumElement> {
    return Matchers.getElementByText(tokenSymbol, index);
  }

  getFirstTokenOption(tokenSymbol: string): Promise<AppiumElement> {
    return Matchers.getElementByNativeXPath(
      `//*[@resource-id='${tokenSymbol}' or contains(@text,'${tokenSymbol}') or contains(@content-desc,'${tokenSymbol}')]/*[@resource-id='badgenetwork']`,
    );
  }

  getNetworkFilter(networkName: string): Promise<AppiumElement> {
    const networkFilter =
      networkName === 'Ethereum'
        ? ETHEREUM_NETWORK_FILTER_TEST_ID
        : ARBITRUM_NETWORK_FILTER_TEST_ID;
    return Matchers.getElementByID(networkFilter);
  }

  getKeypadButton(key: string): Promise<AppiumElement> {
    return Matchers.getElementByID(getKeypadKeyTestId(key));
  }

  async expectText(
    elem: Promise<AppiumElement>,
    text: string,
    description: string,
  ): Promise<void> {
    await Assertions.expectElementToHaveText(elem, text, { description });
  }

  // Amount row text includes the label; match by contains.
  private async expectTextContains(
    elem: Promise<AppiumElement>,
    text: string,
    description: string,
  ): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const resolved = (await elem) as { textContent: () => Promise<string> };
        const actualText = (await resolved.textContent())
          .replace(/\s+/gu, ' ')
          .trim();
        if (!actualText.includes(text)) {
          throw new Error(
            `${description}: expected text containing "${text}" but got "${actualText}"`,
          );
        }
      },
      { timeout: 15000, description },
    );
  }

  async tapPayWithRow(): Promise<void> {
    await Gestures.waitAndTap(this.payWithRow, {
      elemDescription: 'Pay With Row',
    });
  }

  getPercentageButton(pct: 10 | 25 | 50 | 90): Promise<AppiumElement> {
    return Matchers.getElementByText(`${pct}%`);
  }

  async tapPercentage(pct: 10 | 25 | 50 | 90): Promise<void> {
    await Gestures.waitAndTap(this.getPercentageButton(pct), {
      elemDescription: `Keyboard ${pct}% button`,
      timeout: 15000,
    });
  }

  get maxButton(): Promise<AppiumElement> {
    return Matchers.getElementByText('Max');
  }

  async tapMax(): Promise<void> {
    await Gestures.waitAndTap(this.maxButton, {
      elemDescription: 'Keyboard Max button',
      timeout: 15000,
    });
  }

  async verifyPercentageApplied(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.keyboardContinueButton, {
      timeout: 15000,
      description:
        'Percentage tap should populate an amount and reveal the Done button',
    });
  }

  get preferredPayTokenRow(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PayWithBottomSheetIDs.CRYPTO_PREFERRED_TOKEN_ROW,
    );
  }

  async tapPreferredPayToken(): Promise<void> {
    await Gestures.waitAndTap(this.preferredPayTokenRow, {
      elemDescription: 'Preferred pay token row',
    });
  }

  async searchToken(tokenName: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.tokenSearchInput, {
      timeout: 15000,
      description: 'Token search field should be visible',
    });
    await Gestures.typeText(this.tokenSearchInput, tokenName, {
      elemDescription: `Search token ${tokenName}`,
      hideKeyboard: false,
    });
  }

  async tapByNetworkFilter(networkName: string): Promise<void> {
    const networkFilter = this.getNetworkFilter(networkName);
    await Assertions.expectElementToBeVisible(networkFilter, {
      timeout: 15000,
      description: 'Network filter should be visible',
    });

    if (PlatformDetector.isIOS()) {
      await Gestures.dblTap(networkFilter);
    } else {
      await Gestures.waitAndTap(networkFilter, {
        checkForDisplayed: true,
        checkEnabled: true,
      });
    }
  }

  async tapFirstUsdc(tokenName: string): Promise<void> {
    const tokenElement = this.getTokenBySymbol(tokenName);

    await Assertions.expectElementToBeVisible(tokenElement, {
      timeout: 15000,
      description: `${tokenName} token should be visible`,
    });
    await Gestures.waitAndTap(tokenElement, {
      checkForDisplayed: true,
      checkEnabled: true,
    });
  }

  async tapPayWithToken(tokenSymbol: string, index = 0): Promise<void> {
    const tokenElement = this.getTokenOptionAt(tokenSymbol, index);
    await Gestures.waitAndTap(tokenElement, {
      elemDescription: `Pay With Token ${tokenSymbol}`,
    });
  }

  // Wait until the continue button stays enabled across consecutive checks.
  private async waitForKeyboardContinueButtonInteractive(): Promise<void> {
    const timeout = 30_000;
    const pollIntervalMs = 250;
    const requiredStableReads = 4;
    const settleMs = 400;
    const start = Date.now();
    let stableReads = 0;

    while (Date.now() - start < timeout) {
      try {
        await Utilities.checkElementEnabled(this.keyboardContinueButton);
        stableReads += 1;
        if (stableReads >= requiredStableReads) {
          await sleep(settleMs);
          return;
        }
      } catch {
        stableReads = 0;
      }
      await sleep(pollIntervalMs);
    }

    throw new Error(
      `Keyboard Continue Button was not enabled for ${requiredStableReads} consecutive checks within ${timeout}ms`,
    );
  }

  async tapKeyboardContinueButton(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.keyboardContinueButton, {
      timeout: 30_000,
      description: 'Keyboard Continue Button should be visible',
    });
    await this.waitForKeyboardContinueButtonInteractive();
    await Gestures.waitAndTap(this.keyboardContinueButton, {
      elemDescription: 'Keyboard Continue Button',
      timeout: 30_000,
      checkForDisplayed: true,
      checkEnabled: false,
    });
  }

  get keypadDeleteButton(): Promise<AppiumElement> {
    return Matchers.getElementByID('keypad-delete-button');
  }

  async clearAmount(): Promise<void> {
    await Gestures.longPress(this.keypadDeleteButton, {
      duration: 600,
      elemDescription: 'Keypad delete button (long-press clears amount)',
      timeout: 15000,
    });
  }

  async tapKeyboardAmount(amount: string): Promise<void> {
    const waitForKeypad = async (): Promise<void> => {
      await Assertions.expectElementToBeVisible(this.getKeypadButton('0'), {
        timeout: 60_000,
        description: 'Transaction pay amount keypad',
      });
    };

    try {
      await waitForKeypad();
    } catch {
      await Assertions.expectElementToBeVisible(this.keyboardContainer, {
        timeout: 60_000,
        description: 'Custom amount input before opening keypad',
      });
      await Gestures.waitAndTap(this.keyboardContainer, {
        elemDescription: 'Custom amount input field',
        timeout: 15_000,
      });
      await waitForKeypad();
    }

    for (const char of amount) {
      await Gestures.waitAndTap(this.getKeypadButton(char), {
        elemDescription: `Keyboard Key ${char}`,
        timeout: 15_000,
      });
    }
  }

  async enterAmountAndContinue(amount: string): Promise<void> {
    await this.tapKeyboardAmount(amount);
    await Assertions.expectElementToBeVisible(this.keyboardContinueButton, {
      timeout: 30_000,
      description: 'Deposit keyboard Done button after amount entry',
    });
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
    await this.expectTextContains(
      this.amount,
      amount,
      'Amount should be correct',
    );
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

  async verifyCustomAmount(amount: string, description: string): Promise<void> {
    await Assertions.expectElementToHaveText(this.keyboardContainer, amount, {
      description,
    });
  }

  async verifyReceiveVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.receive, {
      description: "You'll receive row should be visible",
      timeout: 15000,
    });
  }

  async verifyAvailableBalanceVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.availableBalance, {
      description: 'Available balance row should be visible',
      timeout: 15000,
    });
  }

  async verifyReceive(amount: string): Promise<void> {
    await this.expectText(
      this.receive,
      amount,
      "You'll receive amount should be correct",
    );
  }
}

export default new TransactionPayConfirmation();
