import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { SmokeTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';

import {
  remoteFeatureFlagPredictEnabled,
  confirmationFeatureFlags,
} from '../../../tests/api-mocking/mock-responses/feature-flags-mocks';
import {
  POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS,
  POLYMARKET_TRANSACTION_SENTINEL_MOCKS,
  POLYMARKET_USDC_BALANCE_MOCKS,
} from '../../../tests/api-mocking/mock-responses/polymarket/polymarket-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';

const PredictionMarketFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagPredictEnabled(true),
    ...Object.assign({}, ...confirmationFeatureFlags),
  }); // we need to mock the confirmations redesign Feature flag
  await POLYMARKET_USDC_BALANCE_MOCKS(mockServer); // Sets up all RPC mocks needed for withdraw flow
  await POLYMARKET_TRANSACTION_SENTINEL_MOCKS(mockServer); // needed to load the withdraw/deposit/claim screen
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, false); // do not include winnings for claim flow
};

describe(SmokeTrade('Predictions'), () => {
  it('should withdraw positions', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPolygon().build(),
        restartDevice: true,
        testSpecificMock: PredictionMarketFeature,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPredictButton();
        // TODO: Add withdraw flow
      },
    );
  });
});
