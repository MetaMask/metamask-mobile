import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { RegressionTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PredictMarketList from '../../pages/Predict/PredictMarketList';
import PredictUnavailableView from '../../pages/Predict/PredictUnavailableView';
import Assertions from '../../framework/Assertions';
import { remoteFeatureFlagPredictEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';
import {
  POLYMARKET_MARKET_FEEDS_MOCKS,
  POLYMARKET_ALL_POSITIONS_MOCKS,
  POLYMARKET_EVENT_DETAILS_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import WalletView from '../../pages/wallet/WalletView';
import PredictDetailsPage from '../../pages/Predict/PredictDetailsPage';
import { PredictMarketDetailsSelectorsIDs } from '../../selectors/Predict/Predict.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

// Enable the Predictions feature flag and force Polymarket geoblock
const PredictionGeoBlockedFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagPredictEnabled(true),
  );
  await POLYMARKET_MARKET_FEEDS_MOCKS(mockServer);
  // Mock Infura RPC calls routed via the mobile proxy to avoid live requests
  await mockServer
    .forPost('/proxy')
    .matching((req) =>
      /https:\/\/.*infura\.io\/v3\//.test(
        new URL(req.url).searchParams.get('url') || '',
      ),
    )
    .asPriority(1000)
    .thenCallback(async (request) => {
      const text = await request.body.getText();
      const body: unknown = text ? JSON.parse(text) : undefined;
      const mk = (id?: unknown) => ({
        jsonrpc: '2.0',
        id: (id as number | string) ?? 1,
        result: '0x0',
      });
      if (Array.isArray(body)) {
        const requests = body as {
          id?: number | string;
          method?: string;
        }[];
        return { statusCode: 200, json: requests.map((r) => mk(r?.id)) };
      }
      const single = body as
        | { id?: number | string; method?: string }
        | undefined;
      return { statusCode: 200, json: mk(single?.id) };
    });
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: 'https://polymarket.com/api/geoblock',
    responseCode: 200,
    response: { blocked: true },
  });
  // Also provide positions and event mocks so Positions/Claim UI renders
  await POLYMARKET_ALL_POSITIONS_MOCKS(mockServer);
  await POLYMARKET_EVENT_DETAILS_MOCKS(mockServer);
};

describe(RegressionTrade('Predictions - Geo Restriction'), () => {
  it('setup: logs in and opens Predictions once', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: PredictionGeoBlockedFeature,
        skipReactNativeReload: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPredictButton();
        await Assertions.expectElementToBeVisible(PredictMarketList.container, {
          description: 'Predict market list container should be visible',
        });
      },
    );
  });

  const categories = [
    'trending',
    'new',
    'sports',
    'crypto',
    'politics',
  ] as const;

  for (const category of categories) {
    it(`displays geo restriction modal when tapping Yes in ${category}`, async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          skipReactNativeReload: true,
          testSpecificMock: PredictionGeoBlockedFeature,
        },
        async () => {
          await Assertions.expectElementToBeVisible(
            PredictMarketList.container,
            {
              description: 'Predict market list container should be visible',
            },
          );
          await PredictMarketList.tapCategoryTab(category);
          await PredictMarketList.tapYesBasedOnCategoryAndIndex(category, 1);
          await PredictUnavailableView.expectVisible();
          await PredictUnavailableView.tapGotIt();
        },
      );
    });

    it(`displays geo restriction modal when tapping No in ${category}`, async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          skipReactNativeReload: true,
          testSpecificMock: PredictionGeoBlockedFeature,
        },
        async () => {
          await Assertions.expectElementToBeVisible(
            PredictMarketList.container,
            {
              description: 'Predict market list container should be visible',
            },
          );
          await PredictMarketList.tapCategoryTab(category);
          await PredictMarketList.tapNoBasedOnCategoryAndIndex(category, 1);
          await PredictUnavailableView.expectVisible();
          await PredictUnavailableView.tapGotIt();
        },
      );
    });
  }

  //Claim functionality development in progress
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('displays geo restriction modal when tapping Claim on Wallet > Predictions', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        skipReactNativeReload: true,
        testSpecificMock: PredictionGeoBlockedFeature,
      },
      async () => {
        // Navigate to Predictions tab in Wallet view
        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'Wallet container should be visible',
        });
        await WalletView.tapOnPredictionsTab();
        await Assertions.expectElementToBeVisible(
          WalletView.PredictionsTabContainer,
          {
            description: 'Predictions tab container visible',
          },
        );

        // Tap Claim button at header
        await WalletView.tapClaimButton();
        await PredictUnavailableView.expectVisible();
        await PredictUnavailableView.tapGotIt();
      },
    );
  });

  //Cash out functionality development in progress
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('displays geo restriction modal when tapping Cash out in Market Details', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        skipReactNativeReload: true,
        testSpecificMock: PredictionGeoBlockedFeature,
      },
      async () => {
        // From Wallet Predictions tab open first market card to details
        await Assertions.expectElementToBeVisible(PredictMarketList.container, {
          description: 'Predict market list container should be visible',
        });
        await PredictMarketList.tapMarketCard('trending', 1);
        await Assertions.expectElementToBeVisible(
          PredictDetailsPage.container,
          {
            description: 'Predict details page visible',
          },
        );

        // Navigate to Positions tab and press Cash out
        const positionsTab = Matchers.getElementByID(
          PredictMarketDetailsSelectorsIDs.POSITIONS_TAB,
        ) as unknown as DetoxElement;
        await Gestures.waitAndTap(positionsTab, {
          elemDescription: 'Tap Positions tab',
        });

        const cashOutButton = Matchers.getElementByID(
          PredictMarketDetailsSelectorsIDs.MARKET_DETAILS_CASH_OUT_BUTTON,
        ) as unknown as DetoxElement;
        await Gestures.waitAndTap(cashOutButton, {
          elemDescription: 'Tap Cash out button',
        });

        await PredictUnavailableView.expectVisible();
        await PredictUnavailableView.tapGotIt();
      },
    );
  });
});
