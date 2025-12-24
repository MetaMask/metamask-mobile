import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';
import { PredictMarketListSelectorsIDs, getPredictMarketListSelector, PredictBalanceSelectorsIDs } from '../../e2e/selectors/Predict/Predict.selectors';
import { expect as appwrightExpect } from 'appwright';

class PredictMarketListScreen {

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get container() {
    if (!this._device) {
      return Selectors.getElementByPlatform(PredictMarketListSelectorsIDs.CONTAINER);
    } else {
      return AppwrightSelectors.getElementByID(this._device, PredictMarketListSelectorsIDs.CONTAINER);
    }
  }

  get categoryTabs() {
    if (!this._device) {
      return Selectors.getElementByPlatform(PredictMarketListSelectorsIDs.CATEGORY_TABS);
    } else {
      return AppwrightSelectors.getElementByID(this._device, PredictMarketListSelectorsIDs.CATEGORY_TABS);
    }
  }

  get emptyState() {
    if (!this._device) {
      return Selectors.getElementByPlatform(PredictMarketListSelectorsIDs.EMPTY_STATE);
    } else {
      return AppwrightSelectors.getElementByID(this._device, PredictMarketListSelectorsIDs.EMPTY_STATE);
    }
  }

  getMarketCard(category = 'trending', cardIndex = 1) {
    const marketCardId = getPredictMarketListSelector.marketCardByCategory(category, cardIndex);
    if (!this._device) {
      return Selectors.getElementByPlatform(marketCardId);
    } else {
      return AppwrightSelectors.getElementByID(this._device, marketCardId);
    }
  }

  async isContainerDisplayed() {
    if (!this._device) {
      const container = await this.container;
      await container.waitForDisplayed();
    } else {
      const container = await this.container;
      await appwrightExpect(container).toBeVisible();
    }
  }

  async tapMarketCard(category = 'trending', cardIndex = 1) {
    if (!this._device) {
      const marketCard = await this.getMarketCard(category, cardIndex);
      await Gestures.waitAndTap(marketCard);
    } else {
      const marketCard = await this.getMarketCard(category, cardIndex);
      await AppwrightGestures.tap(marketCard);
    }
  }

  async tapCategoryTab(category) {
    const categoryLabels = {
      trending: 'Trending',
      new: 'New',
      sports: 'Sports',
      crypto: 'Crypto',
      politics: 'Politics',
    };

    if (!this._device) {
      const tabElement = await Selectors.getXpathElementByText(categoryLabels[category]);
      await Gestures.waitAndTap(tabElement);
    } else {
      const tabElement = await AppwrightSelectors.getElementByText(this._device, categoryLabels[category]);
      await AppwrightGestures.tap(tabElement);
    }
  }

  async tapAddFundsButton() {
    if (!this._device) {
      const addFundsButton = await Selectors.getXpathElementByText('Add funds');
      await Gestures.waitAndTap(addFundsButton);
    } else {
      const addFundsButton = await AppwrightSelectors.getElementByCatchAll(
        this._device,
        'Add funds',
      );
      await AppwrightGestures.tap(addFundsButton);
    }
  }

  get balanceCard() {
    if (!this._device) {
      return Selectors.getElementByPlatform(PredictBalanceSelectorsIDs.BALANCE_CARD);
    } else {
      return AppwrightSelectors.getElementByID(this._device, PredictBalanceSelectorsIDs.BALANCE_CARD);
    }
  }

  async isBalanceCardDisplayed() {
    if (!this._device) {
      const balanceCard = await this.balanceCard;
      await balanceCard.waitForDisplayed();
    } else {
      const balanceCard = await this.balanceCard;
      await appwrightExpect(balanceCard).toBeVisible();
    }
  }

  async getAvailableBalanceText() {
    if (!this._device) {
      const balanceText = await Selectors.getXpathElementByText('Available balance');
      await balanceText.waitForDisplayed();
      return balanceText;
    } else {
      const balanceText = await AppwrightSelectors.getElementByCatchAll(
        this._device,
        'Available balance',
      );
      await appwrightExpect(balanceText).toBeVisible();
      return balanceText;
    }
  }

  async isAvailableBalanceDisplayed() {
    if (!this._device) {
      const balanceText = await Selectors.getXpathElementByText('Available balance');
      await balanceText.waitForDisplayed();
    } else {
      const balanceText = await AppwrightSelectors.getElementByCatchAll(
        this._device,
        'Available balance',
      );
      await appwrightExpect(balanceText).toBeVisible();
    }
  }
}

export default new PredictMarketListScreen();

