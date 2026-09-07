import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { RedesignedSendViewSelectorsIDs } from '../../../app/components/Views/confirmations/components/send/RedesignedSendView.testIds';
import {
  Utilities,
  Assertions,
  type AppiumElement,
  getDriver,
} from '../../framework';
import { CommonSelectorsIDs } from '../../../app/util/Common.testIds';
import { SendActionViewSelectorsIDs } from '../../selectors/SendFlow/SendActionView.selectors';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { getAssetTestId } from '../../selectors/Wallet/WalletView.selectors';

class SendView {
  get ethTokenAssetButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(getAssetTestId('ETH'), 0);
  }

  get erc20TokenButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(getAssetTestId('USDC'), 0);
  }

  get amountScreen(): Promise<AppiumElement> {
    return Matchers.getElementByID(RedesignedSendViewSelectorsIDs.SEND_AMOUNT);
  }

  get zeroButton(): Promise<AppiumElement> {
    return Matchers.getElementByID('keypad-key-0');
  }

  get amountFiveButton(): Promise<AppiumElement> {
    return Matchers.getElementByText('5');
  }

  get fiftyPercentButton(): Promise<AppiumElement> {
    return Matchers.getElementByID('percentage-button-50');
  }

  get maxButton(): Promise<AppiumElement> {
    return Matchers.getElementByID('percentage-button-100');
  }

  get continueButton(): Promise<AppiumElement> {
    return Matchers.getElementByText('Continue');
  }

  get recipientAddressInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
    );
  }

  get reviewButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      RedesignedSendViewSelectorsIDs.REVIEW_BUTTON,
    );
  }

  get amountInputField(): Promise<AppiumElement> {
    return Matchers.getElementByID('txn-amount-input');
  }

  get nextButton(): Promise<AppiumElement> {
    return Matchers.getElementByID('txn-amount-next-button');
  }

  get currencySwitch(): Promise<AppiumElement> {
    return Matchers.getElementByID('amount-screen-currency-switch');
  }

  get backButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(CommonSelectorsIDs.BACK_ARROW_BUTTON);
  }

  get insufficientBalanceToCoverFeesError(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      SendActionViewSelectorsIDs.INSUFFICIENT_BALANCE_TO_COVER_FEES_ERROR,
    );
  }

  get insufficientFundsError(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      SendActionViewSelectorsIDs.INSUFFICIENT_FUNDS_ERROR,
    );
  }

  async selectEthereumToken(): Promise<void> {
    // Asset list can still re-render (duplicate rows hydrating) when tapped.
    // The tap may highlight the row without firing onPress, so we wait for
    // stability and retry until Amount.
    await Utilities.executeWithRetry(
      async () => {
        try {
          await Utilities.waitForElementToBeVisible(this.amountScreen, 500);
          return;
        } catch {
          // Still on the asset picker
        }

        await Gestures.waitAndTap(this.ethTokenAssetButton, {
          elemDescription: 'Select ethereum token',
          checkStability: true,
          delay: 1000,
        });

        await Utilities.waitForElementToBeVisible(this.amountScreen, 5000);
      },
      {
        timeout: 25000,
        description: 'Select ethereum token and open amount screen',
      },
    );
  }

  async selectERC20Token(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        try {
          await Utilities.waitForElementToBeVisible(this.amountScreen, 500);
          return;
        } catch {
          // Still on the asset picker
        }

        await Gestures.waitAndTap(this.erc20TokenButton, {
          elemDescription: 'Select ERC20 token',
          checkStability: true,
          delay: 1000,
        });

        await Utilities.waitForElementToBeVisible(this.amountScreen, 5000);
      },
      {
        timeout: 25000,
        description: 'Select ERC20 token and open amount screen',
      },
    );
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
    await Gestures.waitAndTap(this.continueButton, {
      elemDescription: 'Continue button',
    });
  }

  async inputRecipientAddress(address: string): Promise<void> {
    if (PlatformDetector.isIOS()) {
      const wrapper = Matchers.getElementByID('textfield');
      await Gestures.waitAndTap(wrapper, {
        elemDescription: 'Recipient address textfield wrapper',
      });
      await Gestures.typeViaIosKeyboard(address);
    } else {
      await Gestures.typeText(this.recipientAddressInput, address, {
        elemDescription: 'Enter recipient address',
        hideKeyboard: false,
      });
    }

    const drv = getDriver();
    if (drv) {
      try {
        await drv.hideKeyboard();
      } catch {
        // Keyboard may already be dismissed.
      }
    }
  }

  async pressReviewButton(): Promise<void> {
    await Utilities.waitForElementToBeVisible(this.reviewButton, 15000);
    await Utilities.waitForElementToBeEnabled(this.reviewButton);
    await Gestures.waitAndTap(this.reviewButton, {
      elemDescription: 'Review button',
      timeout: 20000,
    });
  }

  async typeInTransactionAmount(amount: string): Promise<void> {
    await Gestures.replaceText(this.amountInputField, amount, {
      elemDescription: 'Amount Input Field',
    });
  }

  /**
   * Enter an amount by tapping individual numpad digits.
   * @param amount - The amount string to enter (e.g., '1', '0.5', '100')
   */
  async enterAmountViaNumpad(amount: string): Promise<void> {
    const isAndroid = PlatformDetector.isAndroid();
    for (const digit of amount.split('')) {
      const keyName = digit === '.' ? 'keypad-key-dot' : `keypad-key-${digit}`;
      const el = isAndroid
        ? Matchers.getElementByText(digit)
        : Matchers.getElementByNativeXPath(`//*[contains(@name,'${keyName}')]`);
      await Gestures.waitAndTap(el, {
        elemDescription: `Numpad digit ${digit}`,
        delay: 300,
      });
    }
  }

  /**
   * Select a recipient account by name from the my accounts suggestions
   * on the recipient selection screen.
   * @param accountName - The account name to select (e.g., 'Account 2')
   */
  async selectRecipientAccount(accountName: string): Promise<void> {
    const el = Matchers.getElementByText(accountName);
    await Gestures.waitAndTap(el, {
      elemDescription: `Select recipient account: ${accountName}`,
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
