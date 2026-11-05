import type { Mockttp } from 'mockttp';
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { SmokeRewards } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import RewardsMoneyView from '../../page-objects/Rewards/RewardsMoneyView.js';
import { openE2EUrl } from '../../framework/DeepLink.js';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import {
  mockRewardsMoneyApi,
  REFEREE_INVITED_BENEFIT_TITLE,
} from '../../api-mocking/mock-responses/rewards-money.js';

/**
 * Appium, not component-view: the case is an OS URL dispatch into the built
 * app (`openE2EUrl` → `handleUniversalLink` → `setPendingDeeplink` →
 * RewardsNavigator). Component-view can register the route, and there is no
 * controller seam an integration test could drive instead.
 */
const MONEY_CAMPAIGN_DEEPLINK =
  'https://link.metamask.io/rewards?campaign=money';

appiumTest.describe(SmokeRewards('Rewards Money deeplink'), () => {
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
          // Rewards links are whitelisted in handleUniversalLink, so no
          // "Proceed with caution" interstitial is shown before navigation.
          await openE2EUrl(MONEY_CAMPAIGN_DEEPLINK);

          await Assertions.expectElementToBeVisible(
            RewardsMoneyView.refereeHeroCard,
            {
              timeout: 20000,
              description:
                'Rewards Money dashboard shows the referee hero after the money campaign deeplink',
            },
          );
          await Assertions.expectTextDisplayed(REFEREE_INVITED_BENEFIT_TITLE, {
            description: 'Referee hero shows the mocked invited benefit title',
          });
        },
      );
    },
  );
});
