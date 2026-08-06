import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
} from '../../../framework/fixtures/FixtureBuilder.js';
import Assertions from '../../../framework/Assertions.js';
import { LocalNode, LocalNodeType } from '../../../framework/types.js';
import { SmokeConfirmations } from '../../../tags.js';
import { AnvilPort } from '../../../framework/fixtures/FixtureUtils.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import {
  confirmSponsoredNativeSendAndOpenActivity,
  startRedesignedNativeSendFiveEthToReview,
} from '../../../flows/confirmations.flow.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import { AnvilManager, Hardfork } from '../../../seeder/anvil-manager.js';
import {
  setupMockRequest,
  setupMockPostRequest,
} from '../../../api-mocking/helpers/mockHelpers.js';
import { SIMULATION_ENABLED_NETWORKS_MOCK } from '../../../api-mocking/mock-responses/simulations.js';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { remoteFeatureEip7702 } from '../../../api-mocking/mock-responses/feature-flags-mocks.js';
import { Mockttp } from 'mockttp';
import {
  getLocalhostSentinelUrl,
  TRANSACTION_RELAY_STATUS_NETWORKS_MOCK,
  TRANSACTION_RELAY_SUBMIT_NETWORKS_MOCK,
} from '../../../api-mocking/mock-responses/transaction-relay-mocks.js';
import { RelayStatus } from '../../../../app/util/transactions/transaction-relay.js';

const TRANSACTION_UUID_MOCK = '1234-5678';
const SENDER_ADDRESS_MOCK = '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3';
const RECIPIENT_ADDRESS_MOCK = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';

const SEND_ETH_TRANSACTION_MOCK = {
  data: '0x',
  from: SENDER_ADDRESS_MOCK,
  to: RECIPIENT_ADDRESS_MOCK,
  value: '0xde0b6B3a7640000',
};

const SIMULATION_ENABLED_NETWORKS_WITH_RELAY = {
  ...SIMULATION_ENABLED_NETWORKS_MOCK,
  response: {
    ...SIMULATION_ENABLED_NETWORKS_MOCK.response,
    1337: {
      ...SIMULATION_ENABLED_NETWORKS_MOCK.response[1337],
      relayTransactions: true,
      sendBundle: true,
    },
    1: {
      network: 'ethereum-mainnet',
      confirmations: true,
      relayTransactions: true,
      sendBundle: true,
    },
  },
};

const SIMULATION_SPONSORED_REQUEST_BODY = {
  jsonrpc: '2.0',
  method: 'infura_simulateTransactions',
  params: [
    {
      transactions: [SEND_ETH_TRANSACTION_MOCK],
      suggestFees: {
        withFeeTransfer: true,
        withTransfer: true,
        with7702: true,
      },
    },
  ],
};

const SIMULATION_SPONSORED_IGNORE_FIELDS = [
  'params.0.blockOverrides',
  'id',
  'params.0.transactions',
  'params.0.suggestFees',
];

const SIMULATION_RESPONSE = {
  jsonrpc: '2.0',
  result: {
    transactions: [
      {
        return:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        status: '0x1',
        gasUsed: '0x5de2',
        gasLimit: '0x5f34',
        fees: [
          {
            maxFeePerGas: '0xf19b9f48d',
            maxPriorityFeePerGas: '0x9febc9',
            balanceNeeded: '0x59d9d3b865ed8',
            currentBalance: '0x77f9fd8d99e7e0',
            error: '',
            tokenFees: [],
          },
        ],
        stateDiff: {},
        feeEstimate: 972988071597550,
        baseFeePerGas: 40482817574,
      },
    ],
    blockNumber: '0x1293669',
    id: 'faaab4c5-edf5-4077-ac75-8d26278ca2c5',
    sponsorship: { isSponsored: true },
  },
};

const setupCommonMocks = async (mockServer: Mockttp) => {
  await setupMockRequest(
    mockServer,
    {
      requestMethod: 'GET',
      url: SIMULATION_ENABLED_NETWORKS_WITH_RELAY.urlEndpoint,
      response: SIMULATION_ENABLED_NETWORKS_WITH_RELAY.response,
      responseCode: 200,
    },
    1000,
  );

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: `${getLocalhostSentinelUrl()}/network`,
    response: SIMULATION_ENABLED_NETWORKS_WITH_RELAY.response,
    responseCode: 200,
  });

  await setupMockPostRequest(
    mockServer,
    getLocalhostSentinelUrl(),
    SIMULATION_SPONSORED_REQUEST_BODY,
    SIMULATION_RESPONSE,
    {
      statusCode: 200,
      ignoreFields: SIMULATION_SPONSORED_IGNORE_FIELDS,
      priority: 1000,
    },
  );

  await setupRemoteFeatureFlagsMock(
    mockServer,
    Object.assign({}, ...remoteFeatureEip7702),
  );

  await setupMockRequest(mockServer, {
    url: /accounts\.api\.cx\.metamask\.io\/v4\/multiaccount\/balances/,
    response: {
      balances: [
        {
          object: 'token',
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ether',
          type: 'native',
          decimals: 18,
          chainId: 1337,
          balance: '10.000000000000000000',
          accountAddress: `eip155:1337:${DEFAULT_FIXTURE_ACCOUNT}`,
        },
      ],
      unprocessedNetworks: [],
    },
    requestMethod: 'GET',
    responseCode: 200,
  });
};

const createFixture = ({ localNodes }: { localNodes?: LocalNode[] }) => {
  const node = localNodes?.[0] as unknown as AnvilManager;
  const rpcPort =
    node instanceof AnvilManager ? (node.getPort() ?? AnvilPort()) : undefined;
  return new FixtureBuilder()
    .withNetworkController({
      chainId: '0x539',
      rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
      type: 'custom',
      nickname: 'Local RPC',
      ticker: 'ETH',
    })
    .withDisabledSmartTransactions()
    .build();
};

const localNodeOptions = [
  {
    type: LocalNodeType.anvil,
    options: {
      hardfork: 'prague' as Hardfork,
      loadState:
        './tests/smoke-appium/confirmations/transactions/7702/withDelegatorContracts.json',
    },
  },
];

// Skipped: Detox suite was disabled
// (https://consensys.slack.com/archives/C02U025CVU4/p1778589879443169).
// Un-skip after Appium validation on main-e2e.
// Also covered by CV: eip-7702-sponsored-relay-api-failure.view.test.tsx
appiumTest.describe.skip(
  SmokeConfirmations('Send native asset using EIP-7702 - Success Case'),
  () => {
    appiumTest.describe.configure({ timeout: 2500000 });

    appiumTest(
      'sends ETH sponsored',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: createFixture,
            restartDevice: true,
            localNodeOptions,
            currentDeviceDetails,
            testSpecificMock: async (mockServer: Mockttp) => {
              await setupCommonMocks(mockServer);

              await setupMockPostRequest(
                mockServer,
                getLocalhostSentinelUrl(),
                {
                  jsonrpc: '2.0',
                  method: 'eth_sendRelayTransaction',
                },
                TRANSACTION_RELAY_SUBMIT_NETWORKS_MOCK.response,
                {
                  statusCode: 200,
                  ignoreFields: ['id', 'params'],
                  priority: 999,
                },
              );

              await setupMockRequest(mockServer, {
                requestMethod: 'GET',
                url: `${getLocalhostSentinelUrl()}/smart-transactions/${TRANSACTION_UUID_MOCK}`,
                response: {
                  transactions: [
                    {
                      hash: TRANSACTION_RELAY_STATUS_NETWORKS_MOCK.response
                        .transactions[0].hash,
                      status: RelayStatus.Success,
                    },
                  ],
                },
                responseCode: 200,
              });
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await startRedesignedNativeSendFiveEthToReview(
              RECIPIENT_ADDRESS_MOCK,
            );
            await confirmSponsoredNativeSendAndOpenActivity();
            await Assertions.expectTextDisplayed('Confirmed', {
              description: 'Activity status Confirmed',
            });
          },
        );
      },
    );
  },
);

// Skipped: Detox suite was disabled
// (https://consensys.slack.com/archives/C02U025CVU4/p1778589879443169).
// Un-skip after Appium validation on main-e2e.
appiumTest.describe.skip(
  SmokeConfirmations('Send native asset using EIP-7702 - Failure Case'),
  () => {
    appiumTest.describe.configure({ timeout: 2500000 });

    appiumTest(
      'fails transaction if error occurs on API',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: createFixture,
            restartDevice: true,
            localNodeOptions,
            currentDeviceDetails,
            testSpecificMock: async (mockServer: Mockttp) => {
              await setupCommonMocks(mockServer);
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await startRedesignedNativeSendFiveEthToReview(
              RECIPIENT_ADDRESS_MOCK,
            );
            await confirmSponsoredNativeSendAndOpenActivity();
            await Assertions.expectTextDisplayed('Failed', {
              description: 'Activity status Failed after relay API error',
            });
          },
        );
      },
    );
  },
);
