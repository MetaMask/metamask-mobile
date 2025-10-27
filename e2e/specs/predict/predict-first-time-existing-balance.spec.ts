import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { RegressionTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PredictMarketList from '../../pages/Predict/PredictMarketList';
import WalletView from '../../pages/wallet/WalletView';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureFlagPredictEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';
import { POLYMARKET_COMPLETE_MOCKS } from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import {
  PredictPositionsSelectorsIDs,
  PredictBalanceSelectorsIDs,
} from '../../selectors/Predict/Predict.selectors';

// Test-specific mocks: enable Predict, allow Polymarket (no geoblock), and seed user data
const PredictionFirstTimeExistingBalance = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagPredictEnabled(true),
  );

  // Avoid any live Infura RPCs routed via the proxy
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
        const requests = body as { id?: number | string; method?: string }[];
        return { statusCode: 200, json: requests.map((r) => mk(r?.id)) };
      }
      const single = body as
        | { id?: number | string; method?: string }
        | undefined;
      return { statusCode: 200, json: mk(single?.id) };
    });

  // Geoblock disabled (user can access Polymarket)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: 'https://polymarket.com/api/geoblock',
    responseCode: 200,
    response: { blocked: false },
  });

  // Seed complete Polymarket data for user: positions, UPNL, balances, market feeds, details
  await POLYMARKET_COMPLETE_MOCKS(mockServer);
};

describe(
  RegressionTrade('Predictions - First-time user with existing balance'),
  () => {
    it('loads Predict feed and displays balance for existing PM account', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          testSpecificMock: PredictionFirstTimeExistingBalance,
          skipReactNativeReload: true,
        },
        async () => {
          await loginToApp();

          // Act - open Predictions from Actions sheet
          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapPredictButton();

          // Assert - Predict feed container visible
          await Assertions.expectElementToBeVisible(
            PredictMarketList.container,
            {
              description: 'Predict market list container should be visible',
            },
          );

          // Assert - Balance card is rendered (user has USDC on Polymarket)
          await Assertions.expectElementToBeVisible(
            Matchers.getElementByID(PredictBalanceSelectorsIDs.BALANCE_CARD),
            {
              description: 'Predict balance card should be visible',
            },
          );
        },
      );
    });

    it('loads Wallet > Predictions tab and displays balance and positions', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          testSpecificMock: PredictionFirstTimeExistingBalance,
          skipReactNativeReload: true,
        },
        async () => {
          // Arrange
          await Assertions.expectElementToBeVisible(WalletView.container, {
            description: 'Wallet container should be visible',
          });

          // Act - navigate to Predictions tab on Wallet
          await WalletView.tapOnPredictionsTab();

          // Assert - balance card and positions lists visible in Wallet > Predictions
          await Assertions.expectElementToBeVisible(
            Matchers.getElementByID(PredictBalanceSelectorsIDs.BALANCE_CARD),
            {
              description:
                'Predict balance card should be visible on Wallet > Predictions',
            },
          );

          await Assertions.expectElementToBeVisible(
            Matchers.getElementByID(
              PredictPositionsSelectorsIDs.CLAIMABLE_POSITIONS_LIST,
            ),
            {
              description:
                'Claimable positions list should be visible on Wallet > Predictions',
            },
          );
        },
      );
    });
  },
);
