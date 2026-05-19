import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { RedesignedSendViewSelectorsIDs } from '../../../app/components/Views/confirmations/components/send/RedesignedSendView.testIds';
import { Utilities, Assertions } from '../../framework';
import { CommonSelectorsIDs } from '../../../app/util/Common.testIds';
import { SendActionViewSelectorsIDs } from '../../selectors/SendFlow/SendActionView.selectors';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import { getNetworkFilterTestId } from '../../../app/components/Views/confirmations/components/network-filter/network-filter.testIds';

class SendView {
  get ethereumTokenButton(): DetoxElement {
    return Matchers.getElementByText('Ethereum');
  }

  get erc20TokenButton(): DetoxElement {
    return Matchers.getElementByText('USD Coin');
  }

  get zeroButton(): DetoxElement {
    return Matchers.getElementByText('0', 1);
  }

  get amountFiveButton(): DetoxElement {
    return Matchers.getElementByText('5');
  }

  get fiftyPercentButton(): DetoxElement {
    return Matchers.getElementByID('percentage-button-50');
  }

  get maxButton(): DetoxElement {
    return Matchers.getElementByID('percentage-button-100');
  }

  get continueButton(): DetoxElement {
    return Matchers.getElementByText('Continue');
  }

  get recipientAddressInput(): DetoxElement {
    return Matchers.getElementByID(
      RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
    );
  }

  get reviewButton(): DetoxElement {
    return Matchers.getElementByID(
      RedesignedSendViewSelectorsIDs.REVIEW_BUTTON,
    );
  }

  get amountInputField(): DetoxElement {
    return Matchers.getElementByID('txn-amount-input');
  }

  get nextButton(): DetoxElement {
    return Matchers.getElementByID('txn-amount-next-button');
  }

  get currencySwitch(): DetoxElement {
    return Matchers.getElementByID('amount-screen-currency-switch');
  }

  get backButton(): DetoxElement {
    return Matchers.getElementByID(CommonSelectorsIDs.BACK_ARROW_BUTTON);
  }

  get insufficientBalanceToCoverFeesError(): DetoxElement {
    return Matchers.getElementByText(
      SendActionViewSelectorsIDs.INSUFFICIENT_BALANCE_TO_COVER_FEES_ERROR,
    );
  }

  get insufficientFundsError(): DetoxElement {
    return Matchers.getElementByText(
      SendActionViewSelectorsIDs.INSUFFICIENT_FUNDS_ERROR,
    );
  }

  async selectEthereumToken(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(this.ethereumTokenButton, {
          elemDescription: 'Select ethereum token',
        });
      },
      appium: async () => {
        // Tap the Ethereum network filter chip (chainId 0x1) to filter tokens
        const networkChip = await PlaywrightMatchers.getElementById(
          getNetworkFilterTestId('0x1'),
        );
        await PlaywrightGestures.waitAndTap(networkChip);
        // Tap the first ETH token row (no testID in production, use text)
        const ethToken = await PlaywrightMatchers.getElementByText('ETH');
        await PlaywrightGestures.waitAndTap(ethToken);
      },
    });
  }

  async selectERC20Token(): Promise<void> {
    await Gestures.waitAndTap(this.erc20TokenButton, {
      elemDescription: 'Select ERC20 token',
    });
  }

  async enterZeroAmount(): Promise<void> {
    await Gestures.waitAndTap(this.zeroButton, {
      elemDescription: '0 button',
    });
  }

  async pressAmountFiveButton(): Promise<void> {
    await Gestures.waitAndTap(this.amountFiveButton, {
      elemDescription: 'Amount 5',
    });
  }

  async pressFiftyPercentButton(): Promise<void> {
    await Gestures.waitAndTap(this.fiftyPercentButton, {
      elemDescription: 'Amount 50%',
    });
  }

  async pressAmountMaxButton(): Promise<void> {
    await Gestures.waitAndTap(this.maxButton, {
      elemDescription: 'Amount Max',
    });
  }

  async pressContinueButton(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(this.continueButton, {
          elemDescription: 'Continue button',
        });
      },
      appium: async () => {
        const el = await PlaywrightMatchers.getElementByText('Continue');
        await PlaywrightGestures.waitAndTap(el);
      },
    });
  }

  async inputRecipientAddress(address: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.typeText(this.recipientAddressInput, address, {
          elemDescription: 'Enter recipient address',
          hideKeyboard: true,
        });
      },
      appium: async () => {
        const el = await PlaywrightMatchers.getElementById(
          RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
        );
        await PlaywrightGestures.typeText(el, address);
        await PlaywrightGestures.hideKeyboard();
      },
    });
  }

  async pressReviewButton(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Utilities.waitForElementToBeVisible(this.reviewButton, 15000);
        await Utilities.waitForElementToBeEnabled(this.reviewButton);
        await Utilities.waitForElementToStopMoving(this.reviewButton, {
          timeout: 10000,
          interval: 250,
          stableCount: 3,
        });
        await Gestures.waitAndTap(this.reviewButton, {
          elemDescription: 'Review button',
          checkStability: false,
          timeout: 20000,
        });
      },
      appium: async () => {
        const el = await PlaywrightMatchers.getElementById(
          RedesignedSendViewSelectorsIDs.REVIEW_BUTTON,
        );
        await PlaywrightGestures.waitAndTap(el);
      },
    });
  }

  async typeInTransactionAmount(amount: string): Promise<void> {
    await Gestures.replaceText(this.amountInputField, amount, {
      elemDescription: 'Amount Input Field',
    });
  }

  /**
   * Enter an amount by tapping individual numpad digits.
   * Works in both Detox and Playwright/Appium contexts.
   * @param amount - The amount string to enter (e.g., '1', '0.5', '100')
   */
  async enterAmountViaNumpad(amount: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        for (const digit of amount.split('')) {
          const el = Matchers.getElementByText(digit);
          await Gestures.waitAndTap(el, {
            elemDescription: `Numpad digit ${digit}`,
          });
        }
      },
      appium: async () => {
        for (const digit of amount.split('')) {
          const el = await PlaywrightMatchers.getElementByText(digit);
          await PlaywrightGestures.waitAndTap(el, { timeout: 30000 });
        }
      },
    });
  }

  /**
   * Select a recipient account by name from the my accounts suggestions
   * on the recipient selection screen.
   * @param accountName - The account name to select (e.g., 'Account 2')
   */
  async selectRecipientAccount(accountName: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        const el = Matchers.getElementByText(accountName);
        await Gestures.waitAndTap(el, {
          elemDescription: `Select recipient account: ${accountName}`,
        });
      },
      appium: async () => {
        const el = await PlaywrightMatchers.getElementByText(accountName);
        await PlaywrightGestures.waitAndTap(el);
      },
    });
  }

  async tapNextButton(): Promise<void> {
    await Gestures.waitAndTap(this.nextButton, {
      elemDescription: 'Next Button on Amount Screen',
    });
  }

  async tapCurrencySwitch(): Promise<void> {
    await Gestures.waitAndTap(this.currencySwitch, {
      elemDescription: 'Currency Switch',
    });
  }

  async tapMaxButton(): Promise<void> {
    await this.pressAmountMaxButton();
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back Button',
    });
  }

  async checkInsufficientBalanceToCoverFeesError(): Promise<void> {
    await Assertions.expectElementToBeVisible(
      this.insufficientBalanceToCoverFeesError,
      { description: 'Insufficient balance to cover fees error message' },
    );
  }

  async checkInsufficientFundsError(): Promise<void> {
    await Assertions.expectElementToHaveText(
      this.insufficientFundsError,
      SendActionViewSelectorsIDs.INSUFFICIENT_FUNDS_ERROR,
      {
        description: 'Insufficient funds error message',
      },
    );
  }
}
export default new SendView();
