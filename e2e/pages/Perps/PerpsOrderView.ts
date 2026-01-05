import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import Utilities from '../../framework/Utilities';
import {
  PerpsOrderHeaderSelectorsIDs,
  PerpsOrderViewSelectorsIDs,
  PerpsAmountDisplaySelectorsIDs,
} from '../../selectors/Perps/Perps.selectors';
import { element as detoxElement, by as detoxBy } from 'detox';

class PerpsOrderView {
  get placeOrderButton() {
    return Matchers.getElementByID(
      PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON,
    );
  }

  get takeProfitButton() {
    return Matchers.getElementByID(
      PerpsOrderViewSelectorsIDs.TAKE_PROFIT_BUTTON,
    );
  }

  get turnNotificationsOnButton() {
    return Matchers.getElementByID(
      PerpsOrderViewSelectorsIDs.TURN_ON_NOTIFICATION_BUTTON,
    );
  }

  // Leverage chip by visible text, e.g., "3x", "10x", "20x"
  leverageOption(leverageX: number, index = 0): DetoxElement {
    return Matchers.getElementByText(`${leverageX}x`, index);
  }

  // Row label to open the leverage modal (uses visible text "Leverage")
  get leverageRowLabel(): DetoxElement {
    return Matchers.getElementByText('Leverage');
  }

  // Modal title to ensure the leverage bottom sheet is visible
  get leverageModalTitle(): DetoxElement {
    return Matchers.getElementByText('Set Leverage');
  }

  async tapPlaceOrderButton() {
    await Gestures.waitAndTap(this.placeOrderButton);
  }

  async tapTakeProfitButton() {
    await Gestures.waitAndTap(this.takeProfitButton);
  }

  async tapTurnOnNotificationsButton() {
    await Gestures.waitAndTap(this.turnNotificationsOnButton, {
      elemDescription: 'Turn on Notifications Button',
    });
  }

  async selectLeverage(leverageX: number) {
    // Open leverage modal
    await Gestures.waitAndTap(this.leverageRowLabel, {
      elemDescription: 'Open leverage modal',
    });

    // Wait for the modal to be visible
    await Assertions.expectElementToBeVisible(this.leverageModalTitle, {
      description: 'Leverage modal title visible',
    });

    // Tap quick option (2x/5x/10x/20x/40x) deterministically using visibility checks
    // Detect the highest existing index and use it (button > slider label)
    const label = `${leverageX}x`;
    let chosenIdx = -1;
    for (const idx of [3, 2, 1, 0]) {
      const candidate = detoxElement(detoxBy.text(label)).atIndex(idx);
      const exists = await Utilities.isElementVisible(
        candidate as unknown as DetoxElement,
        250,
      );
      if (exists) {
        chosenIdx = idx;
        break;
      }
    }
    if (chosenIdx < 0) {
      throw new Error(`Leverage option ${label} not found`);
    }

    // Tap the detected option index
    const option = this.leverageOption(leverageX, chosenIdx);
    await Gestures.waitAndTap(option, {
      elemDescription: `Select leverage ${label} at index ${chosenIdx}`,
    });

    // Confirm by tapping footer button "Set Xx"
    const confirm = Matchers.getElementByText(
      `Set ${leverageX}x`,
    ) as DetoxElement;
    await Gestures.waitAndTap(confirm, {
      elemDescription: `Confirm leverage ${leverageX}x`,
    });
  }

  // Amount handling
  get amountDisplay(): DetoxElement {
    return Matchers.getElementByID(PerpsAmountDisplaySelectorsIDs.CONTAINER);
  }

  get amountValue(): DetoxElement {
    return Matchers.getElementByID(PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL);
  }

  // Required for next test
  async setAmountUSD(amount: string) {
    // Open keypad by tapping the value by ID (more reliable than tapping the container)
    await device.disableSynchronization();
    await Assertions.expectElementToBeVisible(this.amountValue, {
      description: 'Amount value is visible',
    });
    await Gestures.waitAndTap(this.amountValue, {
      elemDescription: 'Open amount keypad by tapping amount label',
      checkEnabled: false,
      checkVisibility: false,
    });
    // Type each character using the native keypad (buttons 0-9 and '.')
    for (const ch of amount) {
      const key = Matchers.getElementByText(ch) as DetoxElement;
      await Gestures.waitAndTap(key, {
        elemDescription: `Keypad: ${ch}`,
        checkEnabled: false,
        checkVisibility: false,
      });
    }
    // Close the keypad using the Done button (with locale fallbacks)
    const doneByText = Matchers.getElementByText('Done') as DetoxElement;

    await Gestures.waitAndTap(doneByText, {
      elemDescription: 'Tap Done (by text) to close keypad',
      checkEnabled: false,
      checkVisibility: false,
    });

    await device.enableSynchronization();
  }

  // Order type / Limit Price helpers
  private get orderTypeMarket(): DetoxElement {
    return Matchers.getElementByText('Market');
  }

  private get orderTypeSelector(): DetoxElement {
    return Matchers.getElementByID(
      PerpsOrderHeaderSelectorsIDs.ORDER_TYPE_BUTTON,
    );
  }
  private get orderTypeLimit(): DetoxElement {
    return Matchers.getElementByText('Limit');
  }

  async openOrderTypeSelector(): Promise<void> {
    await Gestures.waitAndTap(this.orderTypeSelector);
  }

  async selectLimitOrderType() {
    await Gestures.waitAndTap(this.orderTypeLimit, {
      elemDescription: 'Select Limit order type',
    });
  }

  async setLimitPricePresetLong(preset: string) {
    const presetButton = Matchers.getElementByText(preset) as DetoxElement;
    await Gestures.waitAndTap(presetButton, {
      elemDescription: `Select limit price preset ${preset}`,
    });
  }

  async confirmLimitPrice() {
    const setButton = Matchers.getElementByText('Set') as DetoxElement;
    await Gestures.waitAndTap(setButton, {
      elemDescription: 'Confirm limit price',
    });
  }
}

export default new PerpsOrderView();
