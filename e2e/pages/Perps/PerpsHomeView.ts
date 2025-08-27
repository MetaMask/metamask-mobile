import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import {
  PerpsMarketTabsSelectorsIDs,
  PerpsHomeSelectorsIDs,
  PerpsTutorialSelectorsIDs,
} from '../../selectors/Perps/Perps.selectors';

class PerpsHomeView {
  get container(): DetoxElement {
    return Matchers.getElementByID(PerpsMarketTabsSelectorsIDs.CONTAINER);
  }

  async expectFirstTimeContainerLoaded(): Promise<void> {
    await Assertions.expectElementToBeVisible(
      element(by.id(PerpsHomeSelectorsIDs.FIRST_TIME_CONTAINER)),
      {
        description: 'Perps first-time container should be visible',
        timeout: 7000,
      },
    );
  }

  async expectLoaded(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Perps Market Tabs container should be visible',
      timeout: 7000,
    });
  }

  get startTradingButton(): DetoxElement {
    return Matchers.getElementByID(PerpsHomeSelectorsIDs.START_TRADING_BUTTON);
  }

  async tapStartTrading(): Promise<void> {
    await this.expectFirstTimeContainerLoaded();
    await Assertions.expectElementToBeVisible(this.startTradingButton);
    await Gestures.waitAndTap(this.startTradingButton, {
      elemDescription: 'Perps Home - Start Trading Button',
      delay: 300,
    });
  }

  async completeTutorialAndTapAddFunds(): Promise<void> {
    for (let i = 0; i < 5; i++) {
      try {
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByID(PerpsTutorialSelectorsIDs.ADD_FUNDS_BUTTON),
          { timeout: 800, description: 'Tutorial Add funds visible' },
        );
        break;
      } catch {
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByID(PerpsTutorialSelectorsIDs.CONTINUE_BUTTON),
          { timeout: 2000, description: 'Tutorial Continue visible' },
        );
        await Gestures.waitAndTap(
          Matchers.getElementByID(PerpsTutorialSelectorsIDs.CONTINUE_BUTTON),
          { elemDescription: 'Perps tutorial Continue', delay: 300 },
        );
      }
    }
    await Gestures.waitAndTap(
      Matchers.getElementByID(PerpsTutorialSelectorsIDs.SKIP_BUTTON),
      { elemDescription: 'Perps tutorial Add funds', delay: 500 },
    );
  }
}

export default new PerpsHomeView();
