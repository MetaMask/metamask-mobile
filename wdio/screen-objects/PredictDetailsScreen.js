import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import AppwrightSelectors from '../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../tests/framework/AppwrightGestures';
import {
  PredictMarketDetailsSelectorsIDs,
  PredictMarketDetailsSelectorsText,
} from '../../app/components/UI/Predict/Predict.testIds';
import { expect as appwrightExpect } from 'appwright';

const TAB_BAR_TAB_ID_PREFIX = 'predict-market-details-tab-bar-tab';

class PredictDetailsScreen {

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get container() {
    if (!this._device) {
      return Selectors.getElementByPlatform(PredictMarketDetailsSelectorsIDs.SCREEN);
    } else {
      return AppwrightSelectors.getElementByID(this._device, PredictMarketDetailsSelectorsIDs.SCREEN);
    }
  }

  get backButton() {
    if (!this._device) {
      return Selectors.getElementByPlatform(PredictMarketDetailsSelectorsIDs.BACK_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, PredictMarketDetailsSelectorsIDs.BACK_BUTTON);
    }
  }

  get aboutTab() {
    if (!this._device) {
      return Selectors.getXpathElementByText(PredictMarketDetailsSelectorsText.ABOUT_TAB_TEXT);
    }
    // Tab bar tab ID varies (tab-0, tab-1, tab-2); find by ID prefix + text
    const text = PredictMarketDetailsSelectorsText.ABOUT_TAB_TEXT;
    const xpath = AppwrightSelectors.isAndroid(this._device)
      ? `//*[contains(@resource-id,'${TAB_BAR_TAB_ID_PREFIX}') and (@text='${text}' or @content-desc='${text}')]`
      : `//*[contains(@name,'${TAB_BAR_TAB_ID_PREFIX}') and (@label='${text}' or contains(@label,'${text}'))]`;
    return AppwrightSelectors.getElementByXpath(this._device, xpath);
  }

  get positionsTab() {
    if (!this._device) {
      return Selectors.getXpathElementByText(PredictMarketDetailsSelectorsText.POSITIONS_TAB_TEXT);
    }
    const text = PredictMarketDetailsSelectorsText.POSITIONS_TAB_TEXT;
    const xpath = AppwrightSelectors.isAndroid(this._device)
      ? `//*[contains(@resource-id,'${TAB_BAR_TAB_ID_PREFIX}') and (@text='${text}' or @content-desc='${text}')]`
      : `//*[contains(@name,'${TAB_BAR_TAB_ID_PREFIX}') and (@label='${text}' or contains(@label,'${text}'))]`;
    return AppwrightSelectors.getElementByXpath(this._device, xpath);
  }

  get outcomesTab() {
    if (!this._device) {
      return Selectors.getXpathElementByText(PredictMarketDetailsSelectorsText.OUTCOMES_TAB_TEXT);
    }
    const text = PredictMarketDetailsSelectorsText.OUTCOMES_TAB_TEXT;
    const xpath = AppwrightSelectors.isAndroid(this._device)
      ? `//*[contains(@resource-id,'${TAB_BAR_TAB_ID_PREFIX}') and (@text='${text}' or @content-desc='${text}')]`
      : `//*[contains(@name,'${TAB_BAR_TAB_ID_PREFIX}') and (@label='${text}' or contains(@label,'${text}'))]`;
    return AppwrightSelectors.getElementByXpath(this._device, xpath);
  }

  get aboutTabContent() {
    if (!this._device) {
      return Selectors.getElementByPlatform(PredictMarketDetailsSelectorsIDs.ABOUT_TAB);
    } else {
      return AppwrightSelectors.getElementByID(this._device, PredictMarketDetailsSelectorsIDs.ABOUT_TAB);
    }
  }

  get outcomesTabContent() {
    if (!this._device) {
      return Selectors.getElementByPlatform(PredictMarketDetailsSelectorsIDs.OUTCOMES_TAB);
    } else {
      return AppwrightSelectors.getElementByID(this._device, PredictMarketDetailsSelectorsIDs.OUTCOMES_TAB);
    }
  }

  async isVisible() {
    if (!this._device) {
      const container = await this.container;
      await container.waitForDisplayed();
    } else {
      const container = await this.container;
      await appwrightExpect(container).toBeVisible();
    }
  }

  async tapBackButton() {
    if (!this._device) {
      const backButton = await this.backButton;
      await Gestures.waitAndTap(backButton);
    } else {
      await AppwrightGestures.tap(await this.backButton);
    }
  }

  async tapAboutTab() {
    if (!this._device) {
      const aboutTab = await this.aboutTab;
      await Gestures.waitAndTap(aboutTab);
    } else {
      await AppwrightGestures.tap(await this.aboutTab);
    }
  }

  async tapPositionsTab() {
    if (!this._device) {
      const positionsTab = await this.positionsTab;
      await Gestures.waitAndTap(positionsTab);
    } else {
      await AppwrightGestures.tap(await this.positionsTab);
    }
  }

  /**
   * Returns true if the Outcomes tab is visible (market has multiple outcomes).
   * Yes/No-only markets do not show the Outcomes tab.
   */
  async hasOutcomesTab() {
    if (!this._device) {
      try {
        const outcomesTab = await this.outcomesTab;
        await outcomesTab.waitForDisplayed({ timeout: 2000 });
        return true;
      } catch {
        return false;
      }
    }
    try {
      const outcomesTab = await this.outcomesTab;
      await appwrightExpect(outcomesTab).toBeVisible({ timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  async tapOutcomesTab() {
    if (!this._device) {
      const outcomesTab = await this.outcomesTab;
      await Gestures.waitAndTap(outcomesTab);
    } else {
      await AppwrightGestures.tap(await this.outcomesTab);
    }
  }

  async isAboutTabContentDisplayed() {
    if (!this._device) {
      const aboutTabContent = await this.aboutTabContent;
      await aboutTabContent.waitForDisplayed();
    } else {
      const aboutTabContent = await this.aboutTabContent;
      await appwrightExpect(aboutTabContent).toBeVisible();
    }
  }

  async isOutcomesTabContentDisplayed() {
    if (!this._device) {
      const outcomesTabContent = await this.outcomesTabContent;
      await outcomesTabContent.waitForDisplayed();
    } else {
      const outcomesTabContent = await this.outcomesTabContent;
      await appwrightExpect(outcomesTabContent).toBeVisible();
    }
  }

  async verifyVolumeTextDisplayed() {
    if (!this._device) {
      const volumeText = await Selectors.getXpathElementByText('Volume');
      await volumeText.waitForDisplayed();
    } else {
      const volumeText = await AppwrightSelectors.getElementByText(this._device, 'Volume');
      await appwrightExpect(volumeText).toBeVisible();
    }
  }
}

export default new PredictDetailsScreen();
