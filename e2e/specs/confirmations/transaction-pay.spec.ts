import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import {
  remoteFeatureEip7702,
  remoteFeatureFlagPredictEnabled,
} from '../../api-mocking/mock-responses/feature-flags-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { POLYMARKET_COMPLETE_MOCKS } from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import PredictAddFunds from '../../pages/Predict/PredictAddFunds';
import {
  mockRelayQuote,
  mockRelayStatus,
} from '../../api-mocking/mock-responses/transaction-pay';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import TestHelpers from '../../helpers';

const PredictionMarketFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagPredictEnabled(true),
    ...remoteFeatureEip7702[1],
  });

  await POLYMARKET_COMPLETE_MOCKS(mockServer);
  await mockRelayQuote(mockServer);
  await mockRelayStatus(mockServer);
};

describe(SmokePredictions('Transaction Pay'), () => {
  it('depoits USDC.e to Predict account', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPolygon()
          .withTokenRates(
            CHAIN_IDS.POLYGON,
            '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            2.0,
          )
          .withTokenRates(
            CHAIN_IDS.LINEA_MAINNET,
            '0x0000000000000000000000000000000000000000',
            2.0,
          )
          .build(),
        restartDevice: true,
        testSpecificMock: PredictionMarketFeature,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPredictButton();
        await device.disableSynchronization();
        await PredictAddFunds.tapAddFunds();
        await TestHelpers.delay(10000);
      },
    );
  });
});
