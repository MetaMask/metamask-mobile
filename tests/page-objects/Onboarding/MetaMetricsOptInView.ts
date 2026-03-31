import { MetaMetricsOptInSelectorsIDs } from '../../../app/components/UI/OptinMetrics/MetaMetricsOptIn.testIds';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import {
  asDetoxElement,
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

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
          {
            exact: true,
          },
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
          {
            exact: true,
          },
        ),
    });
  }

  get metricsCheckbox(): DetoxElement {
    return Matchers.getElementByID(
      MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_METRICS_CHECKBOX,
    );
  }

  async swipeContentUp(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.swipe(this.optInMetricsContent, 'up', {
          speed: 'fast',
          percentage: 0.9,
          elemDescription: 'Opt-in Metrics Privacy Policy Content',
        });
      },
      appium: async () => undefined,
    });
  }

  async tapAgreeButton(): Promise<void> {
    await this.tapIAgreeButton();
  }

  async tapIAgreeButton(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await this.swipeContentUp();
        await Gestures.waitAndTap(asDetoxElement(this.iAgreeButton), {
          elemDescription: 'Opt-in Metrics Continue Button',
        });
      },
      appium: async () => {
        await UnifiedGestures.tap(this.iAgreeButton, {
          description: 'Opt-in Metrics Continue Button',
        });
      },
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
}

export default new MetaMetricsOptIn();
