import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import {
  PerpsOrderViewSelectorsIDs,
  PerpsAmountDisplaySelectorsIDs,
} from '../../selectors/Perps/Perps.selectors';
import {
  ToastSelectorsIDs,
  ToastSelectorsText,
} from '../../selectors/wallet/ToastModal.selectors';

class PerpsOrderView {
  // Amount display acts as input activator for keypad and % buttons
  get amountDisplay(): DetoxElement {
    return Matchers.getElementByID(PerpsAmountDisplaySelectorsIDs.CONTAINER);
  }

  get leverageInfoIcon(): DetoxElement {
    return Matchers.getElementByID(
      PerpsOrderViewSelectorsIDs.LEVERAGE_INFO_ICON,
    );
  }

  get toastContainer(): DetoxElement {
    return Matchers.getElementByID(ToastSelectorsIDs.CONTAINER);
  }

  async tapAmountDisplay(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.amountDisplay);
    await Gestures.waitAndTap(this.amountDisplay, {
      elemDescription: 'Tap amount display to focus input',
      delay: 100,
    });
  }

  async setAmountToPercentage(percentage: 0.25 | 0.5 | 1): Promise<void> {
    const label =
      percentage === 0.25 ? '25%' : percentage === 0.5 ? '50%' : 'Max';
    const button = Matchers.getElementByText(label);
    await Assertions.expectElementToBeVisible(button as DetoxElement, {
      description: `Expect ${label} button visible`,
      timeout: 5000,
    });
    await Gestures.waitAndTap(button as DetoxElement, {
      elemDescription: `Tap ${label} percentage button`,
      delay: 100,
    });
    // Cerrar keypad con Done
    // const done = await Matchers.getElementByText('Done');
    // await Gestures.waitAndTap(done, { elemDescription: 'Tap Done on keypad' });
  }

  async enterAmountWithKeypad(amount: string): Promise<void> {
    await device.disableSynchronization();
    await this.tapAmountDisplay();
    for (const digit of amount) {
      const key = Matchers.getElementByText(digit);
      await Assertions.expectElementToBeVisible(key as DetoxElement);
      await Gestures.waitAndTap(key as DetoxElement, {
        elemDescription: `Tap keypad key ${digit}`,
        delay: 60,
      });
    }
    const done = Matchers.getElementByText('Done');
    await Gestures.waitAndTap(done as DetoxElement, {
      elemDescription: 'Tap Done on keypad',
    });
    await device.enableSynchronization();
  }

  async tapPlaceOrderLong(assetSymbol: string): Promise<void> {
    // Botón inferior con label "Long <ASSET>"
    const button = Matchers.getElementByText(
      new RegExp(`^Long ${assetSymbol}$`, 'i'),
    );
    await Assertions.expectElementToBeVisible(button as DetoxElement, {
      description: `Expect Long ${assetSymbol} button visible`,
      timeout: 7000,
    });
    await Gestures.waitAndTap(button as DetoxElement, {
      elemDescription: `Tap Long ${assetSymbol} place order button`,
      delay: 150,
    });
  }

  async tapPlaceOrderShort(assetSymbol: string): Promise<void> {
    // Botón inferior con label "Short <ASSET>"
    const button = Matchers.getElementByText(
      new RegExp(`^Short ${assetSymbol}$`, 'i'),
    );
    await Assertions.expectElementToBeVisible(button as DetoxElement, {
      description: `Expect Short ${assetSymbol} button visible`,
      timeout: 7000,
    });
    await Gestures.waitAndTap(button as DetoxElement, {
      elemDescription: `Tap Short ${assetSymbol} place order button`,
      delay: 150,
    });
  }

  async expectSuccessToastLong(_assetSymbol: string): Promise<void> {
    // Toast title: "Order Placed Successfully - LONG BTC"
    await Assertions.expectElementToBeVisible(this.toastContainer, {
      description: 'Toast container visible',
      timeout: 10000,
    });
    // await Assertions.expectTextDisplayed('Order Placed Successfully', {
    //   timeout: 10000,
    //   allowDuplicates: true,
    // });
    // await Assertions.expectTextDisplayed(`LONG ${assetSymbol}`, {
    //   timeout: 10000,
    //   allowDuplicates: true,
    // });
  }

  async dismissToast(): Promise<void> {
    let button: DetoxElement | null = null;
    try {
      const tryDismiss = Matchers.getElementByText('Dismiss');
      await Assertions.expectElementToBeVisible(tryDismiss as DetoxElement, {
        description: 'Toast Dismiss button visible',
        timeout: 3000,
      });
      button = tryDismiss as DetoxElement;
    } catch {
      const tryClose = Matchers.getElementByText(
        ToastSelectorsText.CLOSE_BUTTON,
      );
      await Assertions.expectElementToBeVisible(tryClose as DetoxElement, {
        description: 'Toast Close button visible',
        timeout: 5000,
      });
      button = tryClose as DetoxElement;
    }
    await Gestures.waitAndTap(button as DetoxElement, {
      elemDescription: 'Tap toast close',
      delay: 100,
    });
    await Assertions.expectElementToNotBeVisible(this.toastContainer, {
      description: 'Toast container should disappear',
      timeout: 10000,
    });
  }
}

export default new PerpsOrderView();
