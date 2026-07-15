import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import Assertions from '../../../framework/Assertions';
import { RegressionWalletPlatform } from '../../../tags';
import SettingsView from '../../../page-objects/Settings/SettingsView';
import SecurityAndPrivacy from '../../../page-objects/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import { loginToApp } from '../../../flows/wallet.flow';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent';
import CommonView from '../../../page-objects/CommonView';
import { optOutAnalyticsExpectations } from '../../../helpers/analytics/expectations/opt-out.analytics';

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
          analyticsExpectations: optOutAnalyticsExpectations,
        },
        async () => {
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
        },
      );
    });
  },
);
