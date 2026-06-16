import { MetaMetricsOptInSelectorsIDs } from '../../../app/components/UI/OptinMetrics/MetaMetricsOptIn.testIds';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import {
  asDetoxElement,
  asPlaywrightElement,
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import { PlatformDetector } from '../../framework/PlatformLocator';
import UnifiedGestures from '../../framework/UnifiedGestures';
import { PlaywrightGestures } from '../../framework';

class MetaMetricsOptIn {
  get container(): EncapsulatedElementType {
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

  get optInMetricsContent(): EncapsulatedElementType {
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
        if (await PlatformDetector.isAndroid()) {
          await PlaywrightGestures.hideKeyboard();
        }
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.iAgreeButton),
          {
            checkForDisplayed: true,
            checkForEnabled: true,
            timeout: 15_000,
          },
        );
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

  async tapMarketingCheckbox(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await this.swipeContentUp();
        await Gestures.waitAndTap(asDetoxElement(this.marketingCheckbox), {
          elemDescription: 'Opt-in Metrics Marketing Checkbox',
        });
      },
      appium: async () => {
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.marketingCheckbox),
          {
            checkForDisplayed: true,
            checkForEnabled: true,
            timeout: 15_000,
          },
        );
      },
    });
  }
}

export default new MetaMetricsOptIn();
