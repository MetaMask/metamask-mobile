import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Mockttp } from 'mockttp';
import {
  POLYMARKET_ACTIVITY_MOCKS,
  POLYMARKET_GEO_ELIGIBLE_MOCKS,
  POLYMARKET_LEGACY_SAFE_ACCOUNT_MOCKS,
  POLYMARKET_POLYGON_RELAY_NETWORK_FLAGS_MOCKS,
  POLYMARKET_POLYGON_RELAY_POLLING_MOCKS,
  POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS,
  POLYMARKET_TRANSACTION_SENTINEL_MOCKS,
  POLYMARKET_USDC_BALANCE_MOCKS,
  POLYMARKET_WITHDRAW_BALANCE_LOAD_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import {
  confirmationFeatureFlags,
  remoteFeatureFlagPredictEnabled,
} from '../../api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { openPredictWithdrawPayConfirmation } from '../../flows/predict.flow';
import { loginToApp } from '../../flows/wallet.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TransactionPayConfirmation from '../../page-objects/Confirmation/TransactionPayConfirmation';
import { SmokePredictions } from '../../tags';

const ENABLE_PREDICT_WITHDRAW_ANY_TOKEN = {
  confirmations_pay_post_quote: {
    default: { enabled: true, tokens: {} },
    overrides: {
      predictWithdraw: {
        enabled: true,
        tokens: {
          '0x89': ['0x2791bca1f2de4661ed88a30c99a7a9449aa84174'],
          '0x1': ['0x0000000000000000000000000000000000000000'],
        },
      },
    },
  },
};

const setupPredictWithdrawMocks = async (mockServer: Mockttp) => {
  await POLYMARKET_POLYGON_RELAY_NETWORK_FLAGS_MOCKS(mockServer);
  await POLYMARKET_POLYGON_RELAY_POLLING_MOCKS(mockServer);
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagPredictEnabled(true),
    ...Object.assign({}, ...confirmationFeatureFlags),
    ...ENABLE_PREDICT_WITHDRAW_ANY_TOKEN,
    perpsPerpTradingEnabled: {
      enabled: false,
      minimumVersion: '0.0.0',
    },
    predictBottomSheet: {
      enabled: false,
      minimumVersion: '0.0.0',
    },
    predictHomeRedesign: {
      enabled: false,
      minimumVersion: '0.0.0',
    },
    predictExtendedSportsMarkets: {
      versions: {
        '7.82.0': {
          enabled: false,
          leagues: [],
          enabledSportsMarketTypes: [],
        },
      },
    },
    carouselBanners: false,
  });
  await POLYMARKET_GEO_ELIGIBLE_MOCKS(mockServer);
  await POLYMARKET_USDC_BALANCE_MOCKS(mockServer);
  await POLYMARKET_LEGACY_SAFE_ACCOUNT_MOCKS(mockServer);
  await POLYMARKET_ACTIVITY_MOCKS(mockServer);
  await POLYMARKET_TRANSACTION_SENTINEL_MOCKS(mockServer);
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, false);
  await POLYMARKET_WITHDRAW_BALANCE_LOAD_MOCKS(mockServer);
};

describe(
  SmokePredictions('Predict - Withdraw to any token (MetaMask Pay)'),
  () => {
    beforeEach(() => {
      jest.setTimeout(150000);
    });

    it('reaches the MetaMask Pay withdraw confirmation', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withPolygon()
            .withTokens(
              [
                {
                  address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
                  decimals: 6,
                  name: 'USD Coin (PoS)',
                  symbol: 'USDC.e',
                },
              ],
              CHAIN_IDS.POLYGON,
            )
            .withDisabledSmartTransactions()
            .build(),
          restartDevice: true,
          testSpecificMock: setupPredictWithdrawMocks,
        },
        async () => {
          await loginToApp();
          await device.disableSynchronization();

          await openPredictWithdrawPayConfirmation();

          // New-flow marker (mirrors the Perps any-token withdraw smoke test):
          // the available balance row only renders on the shared MetaMask Pay
          // confirmation, not the legacy withdraw view.
          await TransactionPayConfirmation.verifyAvailableBalanceVisible();
        },
      );
    });
  },
);
