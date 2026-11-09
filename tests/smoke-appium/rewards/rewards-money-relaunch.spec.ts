import type { Mockttp } from 'mockttp';
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { SmokeWalletPlatform } from '../../tags.js';
import Gestures from '../../framework/Gestures.js';
import RewardsMoneyView from '../../page-objects/Rewards/RewardsMoneyView.js';
import { openE2EUrl } from '../../framework/DeepLink.js';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { mockRewardsMoneyApi } from '../../api-mocking/mock-responses/rewards-money.js';
import { CLAIMED_EARNINGS_SUMMARY } from '../../component-view/presets/rewardsMoney.js';
import { mockIdentityServices } from '../../smoke/identity/utils/mocks.js';

const MONEY_CAMPAIGN_DEEPLINK =
  'metamask://rewards?campaign=money';

async function openClaimedEarnings(): Promise<void> {
  await loginToAppPlaywright({ scenarioType: 'e2e' });
  await openE2EUrl(MONEY_CAMPAIGN_DEEPLINK);
  await RewardsMoneyView.expectRefereeHeroVisible();
  await RewardsMoneyView.tapEarningsTab();
  await RewardsMoneyView.expectClaimedEarnings();
}

appiumTest.describe(SmokeWalletPlatform('Rewards Money relaunch'), () => {
  appiumTest.describe.configure({ timeout: 240000 });

  appiumTest(
    'keeps claimed earnings after the app is killed and relaunched (F5)',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withProfileSyncingEnabled()
            .withRewardsMoneyReferee()
            .build(),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: async (mockServer: Mockttp) => {
            if (currentDeviceDetails.platform === 'ios') {
              await mockIdentityServices(mockServer);
            }
            await setupRemoteFeatureFlagsMock(mockServer, {
              rewardsMoneyControllerEnabled: {
                enabled: true,
                minimumVersion: '1.0.0',
              },
            });
            await mockRewardsMoneyApi(mockServer, CLAIMED_EARNINGS_SUMMARY);
          },
        },
        async () => {
          await openClaimedEarnings();
          await Gestures.terminateApp(currentDeviceDetails);
          await Gestures.relaunchApp(currentDeviceDetails);
          await openClaimedEarnings();
        },
      );
    },
  );
});
