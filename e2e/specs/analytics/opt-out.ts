/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import Assertions from '../../framework/Assertions';
import { RegressionWalletPlatform } from '../../tags';
import SettingsView from '../../pages/Settings/SettingsView';
import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import CommonView from '../../pages/CommonView';
import {
  EventPayload,
  filterEvents,
  getEventsPayloads,
  onboardingEvents,
} from './helpers';
import SoftAssert from '../../utils/SoftAssert';

describe(
  RegressionWalletPlatform(
    'Regression - metametrics opt out from settings WITH ANALYTICS',
  ),
  (): void => {
    beforeEach(async (): Promise<void> => {
      jest.setTimeout(150000);
    });

    it('should disable metametrics from settings and track the preference change event', async (): Promise<void> => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withMetaMetricsOptIn().build(),
          restartDevice: true,
        },
        async ({ mockServer }) => {
          await loginToApp();

          // Navigate to metametrics settings and disable it
          await TabBarComponent.tapSettings();
          await SettingsView.tapSecurityAndPrivacy();
          await SecurityAndPrivacy.scrollToMetaMetrics();

          await Assertions.expectToggleToBeOn(
            SecurityAndPrivacy.metaMetricsToggle as Promise<Detox.IndexableNativeElement>,
          );

          await SecurityAndPrivacy.tapMetaMetricsToggle();
          await CommonView.tapOkAlert();

          await Assertions.expectToggleToBeOff(
            SecurityAndPrivacy.metaMetricsToggle as Promise<Detox.IndexableNativeElement>,
          );

          // Verify the analytics preference change event was tracked
          const events = await getEventsPayloads(mockServer!);
          const softAssert = new SoftAssert();

          await softAssert.checkAndCollect(async () => {
            const analyticsEvents = filterEvents(
              events,
              onboardingEvents.ANALYTICS_PREFERENCE_SELECTED,
            ) as EventPayload[];
            await Assertions.checkIfValueIsDefined(analyticsEvents);
            await Assertions.checkIfArrayHasLength(analyticsEvents, 1);
            await Assertions.checkIfObjectContains(
              analyticsEvents[0].properties,
              {
                has_marketing_consent: false,
                is_metrics_opted_in: true,
                location: 'onboarding_metametrics',
                updated_after_onboarding: false,
              },
            );
          }, 'Analytics Preference Selected event should be tracked when disabling metametrics');

          softAssert.throwIfErrors();
        },
      );
    });
  },
);
