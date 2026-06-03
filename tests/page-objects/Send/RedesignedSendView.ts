import Matchers from '../../framework/Matchers';
import { RedesignedSendViewSelectorsIDs } from '../../../app/components/Views/confirmations/components/send/RedesignedSendView.testIds';
import { Utilities, Assertions } from '../../framework';
import { CommonSelectorsIDs } from '../../../app/util/Common.testIds';
import { SendActionViewSelectorsIDs } from '../../selectors/SendFlow/SendActionView.selectors';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import { PlaywrightElement } from '../../framework/PlaywrightAdapter';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { getNetworkFilterTestId } from '../../../app/components/Views/confirmations/components/network-filter/network-filter.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
  asDetoxElement,
} from '../../framework/EncapsulatedElement';
import UnifiedGestures from '../../framework/UnifiedGestures';

class SendView {
  get ethereumTokenButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Ethereum'),
      appium: () => PlaywrightMatchers.getElementByText('Ethereum'),
    });
  }

  get erc20TokenButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('USD Coin'),
      appium: () => PlaywrightMatchers.getElementByText('USD Coin'),
    });
  }

  get zeroButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('0', 1),
      appium: () => PlaywrightMatchers.getElementByText('0'),
    });
  }

  get amountFiveButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('5'),
      appium: () => PlaywrightMatchers.getElementByText('5'),
    });
  }

  get fiftyPercentButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID('percentage-button-50'),
      appium: () => PlaywrightMatchers.getElementById('percentage-button-50'),
    });
  }

  get maxButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID('percentage-button-100'),
      appium: () => PlaywrightMatchers.getElementById('percentage-button-100'),
    });
  }

  get continueButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Continue'),
      appium: () => PlaywrightMatchers.getElementByText('Continue'),
    });
  }

  get recipientAddressInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
        ),
    });
  }

  get reviewButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(RedesignedSendViewSelectorsIDs.REVIEW_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          RedesignedSendViewSelectorsIDs.REVIEW_BUTTON,
        ),
    });
  }

  get amountInputField(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID('txn-amount-input'),
      appium: () => PlaywrightMatchers.getElementById('txn-amount-input'),
    });
  }

  get nextButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID('txn-amount-next-button'),
      appium: () => PlaywrightMatchers.getElementById('txn-amount-next-button'),
    });
  }

  get currencySwitch(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID('amount-screen-currency-switch'),
      appium: () =>
        PlaywrightMatchers.getElementById('amount-screen-currency-switch'),
    });
  }

  get backButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(CommonSelectorsIDs.BACK_ARROW_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(CommonSelectorsIDs.BACK_ARROW_BUTTON),
    });
  }

  get insufficientBalanceToCoverFeesError(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          SendActionViewSelectorsIDs.INSUFFICIENT_BALANCE_TO_COVER_FEES_ERROR,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          SendActionViewSelectorsIDs.INSUFFICIENT_BALANCE_TO_COVER_FEES_ERROR,
        ),
    });
  }

  get insufficientFundsError(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          SendActionViewSelectorsIDs.INSUFFICIENT_FUNDS_ERROR,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          SendActionViewSelectorsIDs.INSUFFICIENT_FUNDS_ERROR,
        ),
    });
  }

  async selectEthereumToken(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await UnifiedGestures.waitAndTap(this.ethereumTokenButton, {
          elemDescription: 'Select ethereum token',
        });
      },
      appium: async () => {
        // Tap the Ethereum network filter chip (chainId 0x1) to filter tokens
        const networkChip = await PlaywrightMatchers.getElementById(
          getNetworkFilterTestId('0x1'),
        );
        await PlaywrightGestures.scrollIntoView(networkChip);
        await PlaywrightGestures.waitAndTap(networkChip);
        // Tap the first ETH token row (no testID in production, use text)
        const ethToken = await PlaywrightMatchers.getElementByText('ETH');
        await PlaywrightGestures.waitAndTap(ethToken);
      },
    });
  }

  async selectERC20Token(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.erc20TokenButton, {
      elemDescription: 'Select ERC20 token',
    });
  }

  async enterZeroAmount(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.zeroButton, {
      elemDescription: '0 button',
    });
  }

  async pressAmountFiveButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.amountFiveButton, {
      elemDescription: 'Amount 5',
    });
  }

  async pressFiftyPercentButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.fiftyPercentButton, {
      elemDescription: 'Amount 50%',
    });
  }

  async pressAmountMaxButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.maxButton, {
      elemDescription: 'Amount Max',
    });
  }

  async pressContinueButton(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await UnifiedGestures.waitAndTap(this.continueButton, {
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
        await UnifiedGestures.typeText(this.recipientAddressInput, address, {
          elemDescription: 'Enter recipient address',
          hideKeyboard: true,
        });
      },
      appium: async () => {
        const isIOS = await PlatformDetector.isIOS();
        let el;
        if (isIOS) {
          // On iOS, the input has AXUniqueId "textfield" instead of "recipient-address-input"
          el = await PlaywrightMatchers.getElementById('textfield');
        } else {
          el = await PlaywrightMatchers.getElementById(
            RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
          );
        }
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
        await UnifiedGestures.waitAndTap(this.reviewButton, {
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
    await UnifiedGestures.replaceText(this.amountInputField, amount, {
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
          // The numpad "0" is the second element matching text "0" on screen
          const el =
            digit === '0'
              ? Matchers.getElementByText('0', 1)
              : Matchers.getElementByText(digit);
          await UnifiedGestures.waitAndTap(el, {
            elemDescription: `Numpad digit ${digit}`,
          });
        }
      },
      appium: async () => {
        const isAndroid = await PlatformDetector.isAndroid();
        for (const digit of amount.split('')) {
          let el: PlaywrightElement;
          const keyName =
            digit === '.' ? 'keypad-key-dot' : `keypad-key-${digit}`;
          if (isAndroid) {
            el = await PlaywrightMatchers.getElementByText(digit);
          } else {
            el = await PlaywrightMatchers.getElementByXPath(
              `//*[contains(@name,'${keyName}')]`,
            );
          }
          await PlaywrightGestures.waitAndTap(el, { delay: 300 });
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
        await UnifiedGestures.waitAndTap(el, {
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
    await UnifiedGestures.waitAndTap(this.nextButton, {
      elemDescription: 'Next Button on Amount Screen',
    });
  }

  async tapCurrencySwitch(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.currencySwitch, {
      elemDescription: 'Currency Switch',
    });
  }

  async tapMaxButton(): Promise<void> {
    await this.pressAmountMaxButton();
  }

  async tapBackButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.backButton, {
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
      asDetoxElement(this.insufficientFundsError),
      SendActionViewSelectorsIDs.INSUFFICIENT_FUNDS_ERROR,
      {
        description: 'Insufficient funds error message',
      },
    );
  }
}
export default new SendView();
