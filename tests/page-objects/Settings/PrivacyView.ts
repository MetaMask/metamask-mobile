import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { type AppiumElement, type ScrollContainer } from '../../framework';
import { PrivacySettingsSelectorsIDs } from '../../../app/components/Views/Settings/PrivacySettings/PrivacySettings.testIds';

class PrivacyView {
  get scrollViewIdentifier(): ScrollContainer {
    return Matchers.scrollContainer(
      PrivacySettingsSelectorsIDs.PRIVACY_SETTINGS_SCROLL,
    );
  }

  get metaMetricsToggle(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PrivacySettingsSelectorsIDs.METAMETRICS_SWITCH,
    );
  }

  get clearPrivacyDataButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PrivacySettingsSelectorsIDs.CLEAR_PRIVACY_DATA_BUTTON,
    );
  }

  get clearBrowserHistoryButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PrivacySettingsSelectorsIDs.CLEAR_BROWSER_HISTORY_BUTTON,
    );
  }

  get clearCookiesButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PrivacySettingsSelectorsIDs.CLEAR_COOKIES_BUTTON,
    );
  }

  get deleteWalletButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PrivacySettingsSelectorsIDs.DELETE_WALLET_BUTTON,
    );
  }

  get basicFunctionalityToggle(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PrivacySettingsSelectorsIDs.BASIC_FUNCTIONALITY_SWITCH,
    );
  }

  async scrollToMetaMetrics(): Promise<void> {
    await Gestures.scrollToElement(
      this.metaMetricsToggle,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Meta metrics toggle',
      },
    );
  }

  async tapMetaMetricsToggle(): Promise<void> {
    await Gestures.waitAndTap(this.metaMetricsToggle, {
      elemDescription: 'Meta metrics toggle',
    });
  }

  async scrollToClearPrivacyData(): Promise<void> {
    await Gestures.scrollToElement(
      this.clearPrivacyDataButton,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Clear privacy data button',
      },
    );
  }

  async tapClearPrivacyData(): Promise<void> {
    await Gestures.waitAndTap(this.clearPrivacyDataButton, {
      elemDescription: 'Clear privacy data button',
    });
  }

  async scrollToDeleteWalletButton(): Promise<void> {
    await Gestures.scrollToElement(
      this.deleteWalletButton,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Delete wallet button',
      },
    );
  }

  async tapDeleteWalletButton(): Promise<void> {
    await Gestures.waitAndTap(this.deleteWalletButton, {
      elemDescription: 'Delete wallet button',
    });
  }
}

export default new PrivacyView();
