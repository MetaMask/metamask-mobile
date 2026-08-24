import { MetaMetricsOptInSelectorsIDs } from '../../../app/components/UI/OptinMetrics/MetaMetricsOptIn.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';
import { PlatformDetector } from '../../framework/PlatformLocator';

class MetaMetricsOptIn {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(
      MetaMetricsOptInSelectorsIDs.METAMETRICS_OPT_IN_CONTAINER_ID,
    );
  }

  get screenTitle(): EncapsulatedElementType {
    return Matchers.getElementByID(
      MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_CONTINUE_BUTTON_ID,
    );
  }

  get iAgreeButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_CONTINUE_BUTTON_ID,
    );
  }

  get metricsCheckbox(): EncapsulatedElementType {
    return Matchers.getElementByID(
      MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_METRICS_CHECKBOX,
    );
  }

  get marketingCheckbox(): EncapsulatedElementType {
    return Matchers.getElementByID(
      MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_MARKETING_CHECKBOX,
    );
  }

  get scrollViewIdentifier() {
    return Matchers.scrollContainer(
      MetaMetricsOptInSelectorsIDs.METAMETRICS_OPT_IN_CONTAINER_ID,
    );
  }

  async tapAgreeButton(): Promise<void> {
    await this.tapIAgreeButton();
  }

  async tapIAgreeButton(): Promise<void> {
    if (PlatformDetector.isAndroid()) {
      await Gestures.hideKeyboard();
    }
    await Gestures.waitAndTap(this.iAgreeButton, {
      elemDescription: 'Opt-in Metrics Continue Button',
      checkForDisplayed: true,
      checkEnabled: true,
      timeout: 15_000,
    });
  }

  async tapContinueButton(): Promise<void> {
    await this.tapIAgreeButton();
  }

  async tapMetricsCheckbox(): Promise<void> {
    await Gestures.waitAndTap(this.metricsCheckbox, {
      elemDescription: 'Opt-in Metrics Metrics Checkbox',
    });
  }

  async tapMarketingCheckbox(): Promise<void> {
    await Gestures.scrollToElement(
      this.marketingCheckbox,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Opt-in Metrics Marketing Checkbox',
      },
    );
    await Gestures.waitAndTap(this.marketingCheckbox, {
      elemDescription: 'Opt-in Metrics Marketing Checkbox',
    });
  }
}

export default new MetaMetricsOptIn();
