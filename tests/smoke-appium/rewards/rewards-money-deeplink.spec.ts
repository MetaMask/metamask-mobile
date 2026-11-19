import type { Mockttp } from 'mockttp';
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { SmokeWalletPlatform } from '../../tags.js';
import RewardsMoneyView from '../../page-objects/Rewards/RewardsMoneyView.js';
import { openE2EUrl } from '../../framework/DeepLink.js';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import {
  mockRewardsMoneyApi,
  REFEREE_INVITED_BENEFIT_TITLE,
} from '../../api-mocking/mock-responses/rewards-money.js';

const MONEY_CAMPAIGN_DEEPLINK = 'metamask://rewards?campaign=money';

appiumTest.describe(SmokeWalletPlatform('Rewards Money deeplink'), () => {
  appiumTest.describe.configure({ timeout: 240000 });

  appiumTest(
    'opens the Rewards Money dashboard for a referee from the money campaign deeplink',
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
            await setupRemoteFeatureFlagsMock(mockServer, {
              rewardsMoneyControllerEnabled: {
                enabled: true,
                minimumVersion: '1.0.0',
              },
            });
            await mockRewardsMoneyApi(mockServer);
          },
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await openE2EUrl(MONEY_CAMPAIGN_DEEPLINK);
          await RewardsMoneyView.expectRefereeHeroVisible();
          await RewardsMoneyView.expectInvitedBenefitTitle(
            REFEREE_INVITED_BENEFIT_TITLE,
          );
        },
      );
    },
  );
});
