import type { Mockttp } from 'mockttp';
import { merge } from 'lodash';

import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { RegressionWalletUX } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import Assertions from '../../framework/Assertions.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
  ENTROPY_WALLET_1_ID,
} from '../../framework/fixtures/FixtureBuilder.js';
import type {
  AccountTreeControllerState,
  Fixture,
} from '../../framework/fixtures/types.js';
import ActivityScreen, {
  ActivityTypeFilter,
} from '../../page-objects/Transactions/ActivityScreen.js';
import QuoteView from '../../page-objects/swaps/QuoteView.js';
import PredictMarketList from '../../page-objects/Predict/PredictMarketList.js';
import PerpsMarketListView from '../../page-objects/Perps/PerpsMarketListView.js';
import CardHomeView from '../../page-objects/Card/CardHomeView.js';
import BuildQuoteView from '../../page-objects/Ramps/BuildQuoteView.js';
import MockApiHelper from '../../helpers/activity/MockApiHelper.js';
import {
  ACTIVITY_COMPLETED_TX_HASH,
  ACTIVITY_EMPTY_STATE_COPY,
  ACTIVITY_MOCK_FIXTURES,
} from '../../helpers/activity/activityMockFixtures.js';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { remoteFeatureFlagPredictEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks.js';
import { POLYMARKET_COMPLETE_MOCKS } from '../../api-mocking/mock-responses/polymarket/polymarket-mocks.js';
import {
  PERPS_ARBITRUM_MOCKS,
  mockPerpsGeolocation,
} from '../../api-mocking/mock-responses/perps-arbitrum-mocks.js';
import { setupBuyOnRampMocks } from '../../api-mocking/mock-responses/ramps/ramps-mocks.js';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants.js';
import { testSpecificMock as cardholderMocks } from '../../api-mocking/mock-responses/cardholder-mocks.js';

const EVM_ONLY_ACCOUNT_TREE = {
  accountTree: {
    wallets: {
      [ENTROPY_WALLET_1_ID]: {
        id: ENTROPY_WALLET_1_ID,
        type: 'Entropy',
        metadata: { name: 'Secret Recovery Phrase 1' },
        groups: {
          [`${ENTROPY_WALLET_1_ID}/account-1`]: {
            id: `${ENTROPY_WALLET_1_ID}/account-1`,
            type: 'MultipleAccount',
            accounts: ['4d7a5e0b-b261-4aed-8126-43972b0fa0a1'],
            metadata: { name: 'Account 1' },
          },
        },
      },
    },
    selectedAccountGroup: `${ENTROPY_WALLET_1_ID}/account-1`,
  },
};

const USDC_MAINNET = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const SELECTED_RAMP_REGION = RampsRegions[RampsRegionsEnum.UNITED_STATES];

function buildEmptyActivityFixture(options?: {
  funded?: boolean;
  withRampRegion?: boolean;
  withCard?: boolean;
  withPerps?: boolean;
}): Fixture {
  let builder = new FixtureBuilder()
    .withAccountTreeController(
      EVM_ONLY_ACCOUNT_TREE as unknown as Partial<AccountTreeControllerState>,
    )
    .withNetworkEnabledMap({ eip155: { '0x1': true } })
    .withPrivacyModePreferences(false);

  if (options?.withRampRegion) {
    builder = builder.withRampsSelectedRegion(SELECTED_RAMP_REGION);
  }
  if (options?.withCard) {
    builder = builder.withCardController();
  }
  if (options?.withPerps) {
    builder = builder
      .withPerpsProfile('no-positions')
      .withPerpsFirstTimeUser(false);
  }

  const fixture = builder.build();

  if (options?.funded) {
    merge(fixture.state.engine.backgroundState.TokenBalancesController, {
      tokenBalances: {
        [DEFAULT_FIXTURE_ACCOUNT]: {
          '0x1': {
            [USDC_MAINNET]: '0x5f5e100', // 100 USDC
          },
        },
      },
    });
  }

  return fixture;
}

async function mockEmptyTransactionHistory(mockServer: Mockttp): Promise<void> {
  await MockApiHelper.interceptTransactionHistory(mockServer, []);
}

appiumTest.describe(
  RegressionWalletUX('Activity Redesign - Empty State'),
  () => {
    appiumTest.describe.configure({ timeout: 180_000 });

    appiumTest(
      'displays empty state when wallet has no transaction history',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: buildEmptyActivityFixture(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: mockEmptyTransactionHistory,
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await ActivityScreen.openFromTabBar();

            await ActivityScreen.expectEmptyStateContent(
              ACTIVITY_EMPTY_STATE_COPY.transactionsUnfunded.description,
              ACTIVITY_EMPTY_STATE_COPY.transactionsUnfunded.action,
            );
          },
        );
      },
    );

    appiumTest(
      'does not display empty state when wallet has transactions',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: buildEmptyActivityFixture(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: async (mockServer: Mockttp) => {
              await MockApiHelper.interceptTransactionHistory(
                mockServer,
                ACTIVITY_MOCK_FIXTURES.completedTransactions,
              );
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await ActivityScreen.openFromTabBar();

            await ActivityScreen.expectEmptyStateNotVisible();
            await ActivityScreen.expectTransactionTitleVisible(
              ACTIVITY_COMPLETED_TX_HASH,
            );
          },
        );
      },
    );

    appiumTest(
      'Add funds CTA from unfunded Transactions empty state opens buy flow',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: buildEmptyActivityFixture({ withRampRegion: true }),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: async (mockServer: Mockttp) => {
              await mockEmptyTransactionHistory(mockServer);
              await setupBuyOnRampMocks(mockServer, SELECTED_RAMP_REGION);
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await ActivityScreen.openFromTabBar();
            await ActivityScreen.expectEmptyStateContent(
              ACTIVITY_EMPTY_STATE_COPY.transactionsUnfunded.description,
              ACTIVITY_EMPTY_STATE_COPY.transactionsUnfunded.action,
            );

            await ActivityScreen.tapEmptyStateAction(
              ACTIVITY_EMPTY_STATE_COPY.transactionsUnfunded.action,
            );

            await Assertions.expectElementToBeVisible(
              BuildQuoteView.amountToBuyLabel,
              {
                description: 'Buy quote amount label should be visible',
                timeout: 20_000,
              },
            );
          },
        );
      },
    );

    appiumTest(
      'Swap tokens CTA from funded Transactions empty state opens swap',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: buildEmptyActivityFixture({ funded: true }),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: mockEmptyTransactionHistory,
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await ActivityScreen.openFromTabBar();
            await ActivityScreen.expectEmptyStateContent(
              ACTIVITY_EMPTY_STATE_COPY.transactionsFunded.description,
              ACTIVITY_EMPTY_STATE_COPY.transactionsFunded.action,
            );

            await ActivityScreen.tapEmptyStateAction(
              ACTIVITY_EMPTY_STATE_COPY.transactionsFunded.action,
            );

            await Assertions.expectElementToBeVisible(
              QuoteView.sourceTokenArea,
              {
                description: 'Swap/bridge source token area should be visible',
                timeout: 20_000,
              },
            );
          },
        );
      },
    );

    appiumTest(
      'Buy/Sell empty state Add funds CTA opens buy flow',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: buildEmptyActivityFixture({ withRampRegion: true }),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: async (mockServer: Mockttp) => {
              await mockEmptyTransactionHistory(mockServer);
              await setupBuyOnRampMocks(mockServer, SELECTED_RAMP_REGION);
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await ActivityScreen.openFromTabBar();
            await ActivityScreen.selectTypeFilter(ActivityTypeFilter.BuySell);
            await ActivityScreen.expectEmptyStateContent(
              ACTIVITY_EMPTY_STATE_COPY.buySell.description,
              ACTIVITY_EMPTY_STATE_COPY.buySell.action,
            );

            await ActivityScreen.tapEmptyStateAction(
              ACTIVITY_EMPTY_STATE_COPY.buySell.action,
            );

            await Assertions.expectElementToBeVisible(
              BuildQuoteView.amountToBuyLabel,
              {
                description: 'Buy quote amount label should be visible',
                timeout: 20_000,
              },
            );
          },
        );
      },
    );

    appiumTest(
      'Make a prediction CTA opens Predictions market list',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: buildEmptyActivityFixture(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: async (mockServer: Mockttp) => {
              await mockEmptyTransactionHistory(mockServer);
              await setupRemoteFeatureFlagsMock(mockServer, {
                ...remoteFeatureFlagPredictEnabled(true),
              });
              await POLYMARKET_COMPLETE_MOCKS(mockServer);
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await ActivityScreen.openFromTabBar();
            await ActivityScreen.selectTypeFilter(
              ActivityTypeFilter.Predictions,
            );
            await ActivityScreen.expectEmptyStateContent(
              ACTIVITY_EMPTY_STATE_COPY.predictions.description,
              ACTIVITY_EMPTY_STATE_COPY.predictions.action,
            );

            await ActivityScreen.tapEmptyStateAction(
              ACTIVITY_EMPTY_STATE_COPY.predictions.action,
            );

            await PredictMarketList.waitForScreenToDisplay({
              description: 'Predict market list should open from empty CTA',
              timeout: 30_000,
            });
          },
        );
      },
    );

    appiumTest(
      'Browse markets CTA opens Perps market list',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: buildEmptyActivityFixture({ withPerps: true }),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: async (mockServer: Mockttp) => {
              await mockEmptyTransactionHistory(mockServer);
              await setupRemoteFeatureFlagsMock(mockServer, {});
              await PERPS_ARBITRUM_MOCKS(mockServer);
              await mockPerpsGeolocation(
                mockServer,
                RampsRegions[RampsRegionsEnum.SPAIN],
              );
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await ActivityScreen.openFromTabBar();
            await ActivityScreen.selectTypeFilter(ActivityTypeFilter.Perps);
            await ActivityScreen.expectEmptyStateContent(
              ACTIVITY_EMPTY_STATE_COPY.perps.description,
              ACTIVITY_EMPTY_STATE_COPY.perps.action,
            );

            await ActivityScreen.tapEmptyStateAction(
              ACTIVITY_EMPTY_STATE_COPY.perps.action,
            );

            await Assertions.expectElementToBeVisible(
              PerpsMarketListView.listHeader,
              {
                description: 'Perps market list header should be visible',
                timeout: 30_000,
              },
            );
          },
        );
      },
    );

    appiumTest(
      'Open MetaMask Card CTA opens Card home',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: buildEmptyActivityFixture({ withCard: true }),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: async (mockServer: Mockttp) => {
              await mockEmptyTransactionHistory(mockServer);
              await cardholderMocks(mockServer);
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await ActivityScreen.openFromTabBar();
            await ActivityScreen.selectTypeFilter(
              ActivityTypeFilter.MetamaskCard,
            );
            await ActivityScreen.expectEmptyStateContent(
              ACTIVITY_EMPTY_STATE_COPY.metamaskCard.description,
              ACTIVITY_EMPTY_STATE_COPY.metamaskCard.action,
            );

            await ActivityScreen.tapEmptyStateAction(
              ACTIVITY_EMPTY_STATE_COPY.metamaskCard.action,
            );

            await Assertions.expectElementToBeVisible(
              CardHomeView.cardViewTitle,
              {
                description: 'Card home title should be visible',
                timeout: 30_000,
              },
            );
          },
        );
      },
    );
  },
);
