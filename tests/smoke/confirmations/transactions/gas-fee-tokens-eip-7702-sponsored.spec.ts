import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import FooterActions from '../../../../e2e/pages/Browser/Confirmations/FooterActions';
import SendView from '../../../../e2e/pages/Send/RedesignedSendView';
import TabBarComponent from '../../../../e2e/pages/wallet/TabBarComponent';
import WalletView from '../../../../e2e/pages/wallet/WalletView';
import {
  Assertions,
  LocalNode,
  LocalNodeType,
  Utilities,
} from '../../../framework';
import { SmokeConfirmations } from '../../../../e2e/tags';
import { AnvilPort } from '../../../framework/fixtures/FixtureUtils';
import { loginToApp } from '../../../../e2e/viewHelper';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import RowComponents from '../../../../e2e/pages/Browser/Confirmations/RowComponents';
import { AnvilManager, Hardfork } from '../../../seeder/anvil-manager';
import {
  setupMockRequest,
  setupMockPostRequest,
} from '../../../api-mocking/helpers/mockHelpers';
import { SIMULATION_ENABLED_NETWORKS_MOCK } from '../../../api-mocking/mock-responses/simulations';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureEip7702 } from '../../../api-mocking/mock-responses/feature-flags-mocks';
import { Mockttp } from 'mockttp';
import {
  TRANSACTION_RELAY_STATUS_NETWORKS_MOCK,
  TRANSACTION_RELAY_SUBMIT_NETWORKS_MOCK,
} from '../../../api-mocking/mock-responses/transaction-relay-mocks';
import { RelayStatus } from '../../../../app/util/transactions/transaction-relay';

const TRANSACTION_UUID_MOCK = '1234-5678';
const SENDER_ADDRESS_MOCK = '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3';
const RECIPIENT_ADDRESS_MOCK = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';
const SENTINEL_URL = 'https://tx-sentinel-localhost.api.cx.metamask.io';

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
    },
  },
};

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
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: SIMULATION_ENABLED_NETWORKS_WITH_RELAY.urlEndpoint,
    response: SIMULATION_ENABLED_NETWORKS_WITH_RELAY.response,
    responseCode: 200,
  });

  // Mock infura_simulateTransactions
  await setupMockPostRequest(
    mockServer,
    SENTINEL_URL,
    {
      jsonrpc: '2.0',
      method: 'infura_simulateTransactions',
      params: [
        {
          transactions: [SEND_ETH_TRANSACTION_MOCK],
          suggestFees: { withFeeTransfer: true, withTransfer: true },
        },
      ],
    },
    SIMULATION_RESPONSE,
    {
      statusCode: 200,
      ignoreFields: [
        'id',
        'params.0.blockOverrides',
        'params.0.transactions',
        'params.0.suggestFees',
      ],
      priority: 1000,
    },
  );

  await setupRemoteFeatureFlagsMock(
    mockServer,
    Object.assign({}, ...remoteFeatureEip7702),
  );
};

const createFixture = ({ localNodes }: { localNodes?: LocalNode[] }) => {
  const node = localNodes?.[0] as unknown as AnvilManager;
  const rpcPort =
    node instanceof AnvilManager ? (node.getPort() ?? AnvilPort()) : undefined;
  return new FixtureBuilder()
    .withNetworkController({
      providerConfig: {
        chainId: '0x539',
        rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
        type: 'custom',
        nickname: 'Local RPC',
        ticker: 'ETH',
      },
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
        './e2e/specs/confirmations/transactions/7702/withDelegatorContracts.json',
    },
  },
];

const performSendTransaction = async () => {
  await loginToApp();
  await device.disableSynchronization();
  await WalletView.tapWalletSendButton();
  await SendView.selectEthereumToken();
  await SendView.pressAmountFiveButton();
  await SendView.pressContinueButton();
  await SendView.inputRecipientAddress(RECIPIENT_ADDRESS_MOCK);
  await SendView.pressReviewButton();
  await Assertions.expectElementToBeVisible(
    RowComponents.NetworkFeePaidByMetaMask,
  );
  await Utilities.waitForElementToBeVisible(FooterActions.confirmButton);
  // Silenced errors from confirm button not being tappable due to toast overlapping
  try {
    await FooterActions.tapConfirmButton();
  } catch {
    console.log('Confirm button not tappable');
  }
  await TabBarComponent.tapActivity();
};

describe(
  SmokeConfirmations('Send native asset using EIP-7702 - Success Case'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(2500000);
    });

    it('sends ETH sponsored', async () => {
      await withFixtures(
        {
          fixture: createFixture,
          restartDevice: true,
          localNodeOptions,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupCommonMocks(mockServer);

            // Mock eth_sendRelayTransaction
            await setupMockPostRequest(
              mockServer,
              SENTINEL_URL,
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

            // Status check mock
            await setupMockRequest(mockServer, {
              requestMethod: 'GET',
              url: `${SENTINEL_URL}/smart-transactions/${TRANSACTION_UUID_MOCK}`,
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
          await performSendTransaction();
          await Assertions.expectTextDisplayed('Confirmed');
          await device.enableSynchronization();
        },
      );
    });
  },
);

describe(
  SmokeConfirmations('Send native asset using EIP-7702 - Failure Case'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(2500000);
    });

    it('fails transaction if error occurs on API', async () => {
      await withFixtures(
        {
          fixture: createFixture,
          restartDevice: true,
          localNodeOptions,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupCommonMocks(mockServer);
          },
        },
        async () => {
          await performSendTransaction();
          await Assertions.expectTextDisplayed('Failed');
          await device.enableSynchronization();
        },
      );
    });
  },
);
