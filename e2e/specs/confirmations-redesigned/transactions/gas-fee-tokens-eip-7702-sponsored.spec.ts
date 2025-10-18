import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import FooterActions from '../../../pages/Browser/Confirmations/FooterActions';
import SendView from '../../../pages/Send/RedesignedSendView';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import WalletView from '../../../pages/wallet/WalletView';
import { Assertions, LocalNodeType } from '../../../framework';
import { SmokeConfirmationsRedesigned } from '../../../tags';
import { buildPermissions } from '../../../framework/fixtures/FixtureUtils';
import { loginToApp } from '../../../viewHelper';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import RowComponents from '../../../pages/Browser/Confirmations/RowComponents';
import { Hardfork } from '../../../seeder/anvil-manager';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers';
import { SIMULATION_ENABLED_NETWORKS_MOCK } from '../../../api-mocking/mock-responses/simulations';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureEip7702 } from '../../../api-mocking/mock-responses/feature-flags-mocks';
import { Mockttp } from 'mockttp';
import {
  TRANSACTION_RELAY_STATUS_NETWORKS_MOCK,
  TRANSACTION_RELAY_SUBMIT_NETWORKS_MOCK,
} from '../../../api-mocking/mock-responses/transaction-relay-mocks';

const SENDER_ADDRESS_MOCK = '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3';
const RECIPIENT_ADDRESS_MOCK = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';
const LOCALHOST_SENTINEL_URL =
  'https://tx-sentinel-localhost.api.cx.metamask.io';

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

const SIMULATION_GAS_SPONSORSHIP_MOCK = {
  requestBody: {
    id: '0',
    jsonrpc: '2.0',
    method: 'infura_simulateTransactions',
    params: [
      {
        transactions: [SEND_ETH_TRANSACTION_MOCK],
        suggestFees: { withFeeTransfer: true, withTransfer: true },
      },
    ],
  },
  ignoreFields: [
    'params.0.blockOverrides',
    'id',
    'params.0.transactions',
    'params.0.suggestFees',
  ],
  urlEndpoint: LOCALHOST_SENTINEL_URL,
  responseCode: 200,
  response: {
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
  },
};

describe(
  SmokeConfirmationsRedesigned('Send native asset using EIP-7702'),
  () => {
    const testSpecificMock = async (mockServer: Mockttp) => {
      await setupMockRequest(mockServer, {
        requestMethod: 'GET',
        url: SIMULATION_ENABLED_NETWORKS_WITH_RELAY.urlEndpoint,
        response: SIMULATION_ENABLED_NETWORKS_WITH_RELAY.response,
        responseCode: 200,
      });
      await setupMockRequest(mockServer, {
        ...SIMULATION_GAS_SPONSORSHIP_MOCK,
        requestMethod: 'POST',
        url: LOCALHOST_SENTINEL_URL,
        response: SIMULATION_GAS_SPONSORSHIP_MOCK.response,
        responseCode: 200,
      });
      await setupMockRequest(mockServer, {
        ...SIMULATION_GAS_SPONSORSHIP_MOCK,
        requestMethod: 'POST',
        url: `${LOCALHOST_SENTINEL_URL}/`,
        response: SIMULATION_GAS_SPONSORSHIP_MOCK.response,
        responseCode: 200,
      });
      await setupRemoteFeatureFlagsMock(
        mockServer,
        Object.assign({}, ...remoteFeatureEip7702),
      );
      await setupMockRequest(mockServer, {
        requestMethod: 'POST',
        url: `${LOCALHOST_SENTINEL_URL}/`,
        response: TRANSACTION_RELAY_SUBMIT_NETWORKS_MOCK.response,
        responseCode: 200,
      });
      await setupMockRequest(mockServer, {
        requestMethod: 'GET',
        url: `${TRANSACTION_RELAY_STATUS_NETWORKS_MOCK.urlEndpoint}`,
        response: TRANSACTION_RELAY_STATUS_NETWORKS_MOCK.response,
        responseCode: 200,
      });
    };

    it('should send ETH sponsored by MetaMask', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withGanacheNetwork()
            .withPermissionControllerConnectedToTestDapp(
              buildPermissions(['0x539']),
            )
            .withDisabledSmartTransactions()
            .build(),
          restartDevice: true,
          localNodeOptions: [
            {
              type: LocalNodeType.anvil,
              options: {
                hardfork: 'prague' as Hardfork,
                loadState:
                  './e2e/specs/confirmations-redesigned/transactions/7702/withUpgradedAccount.json',
              },
            },
          ],
          testSpecificMock,
        },
        async () => {
          await loginToApp();
          await device.disableSynchronization();
          // send 5 ETH
          await WalletView.tapWalletSendButton();
          await SendView.selectEthereumToken();
          await SendView.pressAmountFiveButton();
          await SendView.pressContinueButton();
          await SendView.inputRecipientAddress(RECIPIENT_ADDRESS_MOCK);
          await SendView.pressReviewButton();
          await Assertions.expectElementToBeVisible(
            RowComponents.NetworkFeePaidByMetaMask,
          );
          await FooterActions.tapConfirmButton();
          await TabBarComponent.tapActivity();
          await Assertions.expectTextDisplayed('Confirmed');
        },
      );
    });
  },
);
