import { MetaMetricsOptInSelectorsIDs } from '../../../app/components/UI/OptinMetrics/MetaMetricsOptIn.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import UnifiedGestures from '../../framework/UnifiedGestures';
import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';

class MetaMetricsOptIn {
  get container(): DetoxElement {
    return Matchers.getElementByID(
      MetaMetricsOptInSelectorsIDs.METAMETRICS_OPT_IN_CONTAINER_ID,
    );
  }

  get screenTitle(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_TITLE_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_TITLE_ID,
        ),
    });
  }

  get optInMetricsContent(): DetoxElement {
    return Matchers.getElementByID(
      MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_PRIVACY_POLICY_DESCRIPTION_CONTENT_1_ID,
    );
  }

  get iAgreeButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_CONTINUE_BUTTON_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_CONTINUE_BUTTON_ID,
        ),
    });
  }

  get metricsCheckbox(): DetoxElement {
    return Matchers.getElementByID(
      MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_METRICS_CHECKBOX,
    );
  }

  async swipeContentUp(): Promise<void> {
    await Gestures.swipe(this.optInMetricsContent, 'up', {
      speed: 'fast',
      percentage: 0.9,
      elemDescription: 'Opt-in Metrics Privacy Policy Content',
    });
  }

  async tapAgreeButton(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await this.swipeContentUp();
        await Gestures.waitAndTap(this.iAgreeButton as DetoxElement, {
          elemDescription: 'Opt-in Metrics Continue Button',
        });
      },
      appium: async () => {
        await UnifiedGestures.tap(this.iAgreeButton);
      },
    });
  }

  async tapMetricsCheckbox(): Promise<void> {
    await Gestures.waitAndTap(this.metricsCheckbox, {
      elemDescription: 'Opt-in Metrics Metrics Checkbox',
    });
  }

  async isScreenTitleVisible(): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const el = await asPlaywrightElement(this.screenTitle);
        await el.waitForDisplayed({ timeout: 30000 });
      },
    });
  }
}

export default new MetaMetricsOptIn();
