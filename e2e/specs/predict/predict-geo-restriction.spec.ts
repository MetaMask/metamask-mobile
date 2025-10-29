import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
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
import { POLYMARKET_MARKET_FEEDS_MOCKS } from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';

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
};

describe(SmokePredictions('Predictions - Geo Restriction'), () => {
  it('displays geo restriction modal when in US region', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: PredictionGeoBlockedFeature,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPredictButton();
        await Assertions.expectElementToBeVisible(PredictMarketList.container, {
          description: 'Predict market list container should be visible',
        });
        await PredictMarketList.tapCategoryTab('new');
        await PredictMarketList.tapYesBasedOnCategoryAndIndex('new', 1);
        await PredictUnavailableView.expectVisible();
        await PredictUnavailableView.tapGotIt();
        await PredictMarketList.tapNoBasedOnCategoryAndIndex('new', 1);
        await PredictUnavailableView.expectVisible();
        await PredictUnavailableView.tapGotIt();
      },
    );
  });
});
