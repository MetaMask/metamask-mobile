import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import {
  PerpsOrderViewSelectorsIDs,
  PerpsAmountDisplaySelectorsIDs,
} from '../../selectors/Perps/Perps.selectors';
import { waitFor, element as detoxElement, by as detoxBy } from 'detox';

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

  async selectLeverage(leverageX: number) {
    // Open leverage modal
    await Gestures.waitAndTap(this.leverageRowLabel, {
      elemDescription: 'Open leverage modal',
    });

    // Wait for the modal to be visible
    await Assertions.expectElementToBeVisible(this.leverageModalTitle, {
      description: 'Leverage modal title visible',
    });

    // Tap quick option (2x/5x/10x/20x/40x)
    // Robust against duplicates: detect the highest existing index and use it (button > slider label)
    const label = `${leverageX}x`;
    let chosenIdx = -1;
    for (const idx of [3, 2, 1, 0]) {
      try {
        await waitFor(detoxElement(detoxBy.text(label)).atIndex(idx))
          .toExist()
          .withTimeout(250);
        chosenIdx = idx;
        break;
      } catch {
        // try next lower index
      }
    }
    if (chosenIdx < 0) {
      throw new Error(`Leverage option ${label} not found`);
    }

    // Prefer unwrapped Detox tap to avoid long internal retries and allow a quick fallback
    let tapped = false;
    for (const idx of [chosenIdx, 1, 0]) {
      try {
        await detoxElement(detoxBy.text(label)).atIndex(idx).tap();
        tapped = true;
        break;
      } catch {
        // try next index quickly
      }
    }
    if (!tapped) {
      // Final fallback with our wrapper to bubble a clear error
      const option = this.leverageOption(leverageX, chosenIdx);
      await Gestures.waitAndTap(option, {
        elemDescription: `Select leverage ${label} at index ${chosenIdx}`,
      });
    }

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
}

export default new PerpsOrderView();
