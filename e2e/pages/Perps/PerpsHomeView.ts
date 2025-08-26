import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import { PerpsMarketTabsSelectorsIDs } from '../../selectors/Perps/Perps.selectors';

class PerpsHomeView {
  get container(): DetoxElement {
    return Matchers.getElementByID(PerpsMarketTabsSelectorsIDs.CONTAINER);
  }

  async expectLoaded(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Perps Market Tabs container should be visible',
    });
  }
}

export default new PerpsHomeView();
