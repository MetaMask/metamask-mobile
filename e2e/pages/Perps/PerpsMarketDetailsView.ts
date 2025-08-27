import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import Utilities from '../../framework/Utilities';
import { PerpsMarketDetailsViewSelectorsIDs } from '../../selectors/Perps/Perps.selectors';
import Gestures from '../../framework/Gestures';

class PerpsMarketDetailsView {
  get header(): DetoxElement {
    return Matchers.getElementByID(PerpsMarketDetailsViewSelectorsIDs.HEADER);
  }

  get longButton(): DetoxElement {
    return Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON,
    );
  }

  get shortButton(): DetoxElement {
    return Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON,
    );
  }

  get addFundsButton(): DetoxElement {
    return Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.ADD_FUNDS_BUTTON,
    );
  }

  async expectLoaded(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.header, {
      description: 'Perps details header visible',
      timeout: 7000,
    });

    // If account has no funds, Add Funds button is shown instead of trade buttons
    const addFundsVisible = await Utilities.isElementVisible(
      this.addFundsButton,
      800,
    );
    if (addFundsVisible) {
      await Assertions.expectElementToBeVisible(this.addFundsButton, {
        description: 'Perps details Add Funds button visible',
        timeout: 2000,
      });
      return;
    }

    await Assertions.expectElementToBeVisible(this.longButton, {
      description: 'Perps details LONG button visible',
      timeout: 7000,
    });
    await Assertions.expectElementToBeVisible(this.shortButton, {
      description: 'Perps details SHORT button visible',
      timeout: 7000,
    });
  }

  async tapAddFunds(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.addFundsButton, {
      description: 'Perps details Add Funds button visible',
      timeout: 3000,
    });
    await Gestures.waitAndTap(this.addFundsButton, {
      elemDescription: 'Perps details Add Funds button',
      delay: 300,
    });
  }

  async tapLong(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.longButton, {
      description: 'Perps details LONG button visible',
      timeout: 5000,
    });
    await Gestures.waitAndTap(this.longButton, {
      elemDescription: 'Tap LONG on market details',
      delay: 150,
    });
  }

  async tapShort(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.shortButton, {
      description: 'Perps details SHORT button visible',
      timeout: 5000,
    });
    await Gestures.waitAndTap(this.shortButton, {
      elemDescription: 'Tap SHORT on market details',
      delay: 150,
    });
  }
}

export default new PerpsMarketDetailsView();
