import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { Mockttp } from 'mockttp';
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../tags.js';
import {
  dismissPushNotificationExistingUserSheet,
  loginToAppPlaywright,
} from '../../flows/wallet.flow.js';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
  ENTROPY_WALLET_1_ID,
} from '../../framework/fixtures/FixtureBuilder.js';
import type { AccountTreeControllerState , Fixture } from '../../framework/fixtures/types.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView.js';
import Assertions from '../../framework/Assertions.js';
import Matchers from '../../framework/Matchers.js';
import { NetworkToCaipChainId } from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import { activityListRowTitleTestId } from '../../../app/components/Views/ActivityList/ActivityList.testIds';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers.js';
import type { TestSpecificMock } from '../../framework/types.js';

/** EVM-only tree avoids Solana snap live transaction fetches. */
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

const ACTIVITY_RECIPIENT = '0x80181d3ba89220cdb80234fc7aa19d5cc56229cc';
const MAINNET_ACTIVITY_HASH = '0xactivitye2emainnettx';
const LINEA_ACTIVITY_HASH = '0xactivitye2elineatx';
/** Linea Mainnet — already covered by DEFAULT_RPC_ENDPOINT_MOCKS (rpc.linea.build). */
const LINEA_CHAIN_ID = '0xe708';

/**
 * Local outgoing txs — Activity redesign's useLocalActivityItems only surfaces
 * user-initiated/outgoing TransactionController rows (incoming is excluded).
 */
const MAINNET_ACTIVITY_TX = {
  id: 'activity-e2e-mainnet-tx',
  hash: MAINNET_ACTIVITY_HASH,
  chainId: '0x1',
  status: TransactionStatus.confirmed,
  time: 1_716_367_781_000,
  type: TransactionType.simpleSend,
  txParams: {
    from: DEFAULT_FIXTURE_ACCOUNT,
    to: ACTIVITY_RECIPIENT,
    value: '0xde0b6b3a7640000',
    nonce: '0x0',
  },
  txReceipt: { status: '0x1' },
};

const LINEA_ACTIVITY_TX = {
  id: 'activity-e2e-linea-tx',
  hash: LINEA_ACTIVITY_HASH,
  chainId: LINEA_CHAIN_ID,
  status: TransactionStatus.confirmed,
  time: 1_716_367_782_000,
  type: TransactionType.simpleSend,
  txParams: {
    from: DEFAULT_FIXTURE_ACCOUNT,
    to: ACTIVITY_RECIPIENT,
    value: '0x1bc16d674ec80000',
    nonce: '0x1',
  },
  txReceipt: { status: '0x1' },
};

/**
 * Adds Linea Mainnet without selecting it (keeps Ethereum selected) and uses the
 * default-mocked `rpc.linea.build` endpoint to avoid live Tenderly traffic.
 */
function ensureLineaNetwork(fixture: Fixture): void {
  const networkController =
    fixture.state.engine.backgroundState.NetworkController;
  networkController.networkConfigurationsByChainId[LINEA_CHAIN_ID] = {
    chainId: LINEA_CHAIN_ID,
    rpcEndpoints: [
      {
        networkClientId: 'linea-mainnet-e2e',
        url: 'https://rpc.linea.build',
        type: 'custom',
        name: 'Linea',
      },
    ],
    defaultRpcEndpointIndex: 0,
    blockExplorerUrls: ['https://lineascan.build'],
    defaultBlockExplorerUrlIndex: 0,
    name: 'Linea',
    nativeCurrency: 'ETH',
  };
}

function createActivityNetworkFilterMocks(): TestSpecificMock {
  return async (mockServer: Mockttp) => {
    // Empty remote history so list rows come from fixture local txs only.
    await setupMockRequest(
      mockServer,
      {
        requestMethod: 'GET',
        url: /^https:\/\/accounts\.api\.cx\.metamask\.io\/v4\/multiaccount\/transactions(\?.*)?$/,
        response: {
          data: [],
          pageInfo: { count: 0, hasNextPage: false },
        },
        responseCode: 200,
      },
      1000,
    );
    await setupRemoteFeatureFlagsMock(mockServer, {
      tmcuActivityRedesignEnabled: true,
    });
  };
}

function createActivityNetworkFilterFixture(): ReturnType<
  FixtureBuilder['build']
> {
  const fixture = new FixtureBuilder()
    .withAccountTreeController(
      EVM_ONLY_ACCOUNT_TREE as unknown as Partial<AccountTreeControllerState>,
    )
    .withNetworkEnabledMap({
      eip155: { '0x1': true, [LINEA_CHAIN_ID]: true },
    })
    .withPrivacyModePreferences(false)
    .withTransactions([MAINNET_ACTIVITY_TX, LINEA_ACTIVITY_TX])
    .build();
  ensureLineaNetwork(fixture);
  return fixture;
}

appiumTest.describe(SmokeWalletPlatform('Activity Network Filter'), () => {
  appiumTest.describe.configure({ timeout: 250000 });

  appiumTest(
    'filters activity list when switching between Mainnet and Linea',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: createActivityNetworkFilterFixture(),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: createActivityNetworkFilterMocks(),
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await dismissPushNotificationExistingUserSheet();

          await TabBarComponent.tapActivity();

          await Assertions.expectElementToExist(
            ActivitiesView.redesignedScreen,
            {
              description: 'Redesigned Activity screen should be visible',
              timeout: 15_000,
            },
          );

          await ActivitiesView.filterByNetwork(NetworkToCaipChainId.ETHEREUM);

          await Assertions.expectElementToBeVisible(
            Matchers.getElementByID(
              activityListRowTitleTestId(MAINNET_ACTIVITY_HASH),
            ),
            {
              description:
                'Mainnet activity row should be visible on Ethereum filter',
              timeout: 20_000,
            },
          );
          await Assertions.expectElementToNotBeVisible(
            Matchers.getElementByID(
              activityListRowTitleTestId(LINEA_ACTIVITY_HASH),
            ),
            {
              description:
                'Linea activity row should not be visible on Ethereum filter',
              timeout: 10_000,
            },
          );

          await ActivitiesView.filterByNetwork(NetworkToCaipChainId.LINEA);

          await Assertions.expectElementToBeVisible(
            Matchers.getElementByID(
              activityListRowTitleTestId(LINEA_ACTIVITY_HASH),
            ),
            {
              description:
                'Linea activity row should be visible on Linea filter',
              timeout: 20_000,
            },
          );
          await Assertions.expectElementToNotBeVisible(
            Matchers.getElementByID(
              activityListRowTitleTestId(MAINNET_ACTIVITY_HASH),
            ),
            {
              description:
                'Mainnet activity row should not be visible on Linea filter',
              timeout: 10_000,
            },
          );
          await Assertions.expectElementToExist(
            ActivitiesView.redesignedScreen,
            {
              description:
                'Activity screen should remain visible after Linea filter (no crash)',
              timeout: 10_000,
            },
          );

          await ActivitiesView.filterByNetwork(NetworkToCaipChainId.ETHEREUM);

          await Assertions.expectElementToBeVisible(
            Matchers.getElementByID(
              activityListRowTitleTestId(MAINNET_ACTIVITY_HASH),
            ),
            {
              description:
                'Mainnet activity row should restore after filtering back to Ethereum',
              timeout: 20_000,
            },
          );
          await Assertions.expectElementToNotBeVisible(
            Matchers.getElementByID(
              activityListRowTitleTestId(LINEA_ACTIVITY_HASH),
            ),
            {
              description:
                'Linea activity row should not remain after restoring Mainnet filter',
              timeout: 10_000,
            },
          );
        },
      );
    },
  );
});
