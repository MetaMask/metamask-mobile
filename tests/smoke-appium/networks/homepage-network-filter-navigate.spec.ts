import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../tags.js';
import {
  loginToAppPlaywright,
  waitForWalletHomePlaywright,
} from '../../flows/wallet.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import TokensFullView from '../../page-objects/wallet/HomeSections.js';
import Assertions from '../../framework/Assertions.js';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { ETH_TOKEN } from './homepage-network-filter.helpers.js';

appiumTest.describe(
  SmokeWalletPlatform('Homepage Network Filter - Navigate'),
  () => {
    appiumTest(
      'navigates from homepage tokens section to tokens full view',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withTokensForAllPopularNetworks([ETH_TOKEN])
              .build(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: async (mockServer) => {
              await setupRemoteFeatureFlagsMock(mockServer, {});
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await waitForWalletHomePlaywright();

            await WalletView.tapOnNewTokensSection();

            await TokensFullView.waitForVisible();
            await Assertions.expectElementToBeVisible(
              TokensFullView.networkFilterButton,
              {
                elemDescription:
                  'Network filter button should be visible in Tokens Full View',
              },
            );
          },
        );
      },
    );
  },
);
