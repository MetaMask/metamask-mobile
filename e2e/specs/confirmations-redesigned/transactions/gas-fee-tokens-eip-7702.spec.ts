import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import FooterActions from '../../../pages/Browser/Confirmations/FooterActions';
import SendView from '../../../pages/Send/RedesignedSendView';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import WalletView from '../../../pages/wallet/WalletView';
import { Assertions, LocalNodeType, Matchers } from '../../../framework';
import { SmokeConfirmationsRedesigned } from '../../../tags';
import { loginToApp } from '../../../viewHelper';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import RowComponents from '../../../pages/Browser/Confirmations/RowComponents';
import { Hardfork } from '../../../seeder/anvil-manager';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers';
import { SIMULATION_ENABLED_NETWORKS_MOCK } from '../../../api-mocking/mock-responses/simulations';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureEip7702 } from '../../../api-mocking/mock-responses/feature-flags-mocks';
import { Mockttp } from 'mockttp';
import { TRANSACTION_RELAY_STATUS_NETWORKS_MOCK } from '../../../api-mocking/mock-responses/transaction-relay-mocks';
import { RelayStatus } from '../../../../app/util/transactions/transaction-relay';
import TransactionConfirmView from '../../../pages/Send/TransactionConfirmView';
import GasFeeTokenModal from '../../../pages/Confirmation/GasFeeTokenModal';

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

const SIMULATION_GAS_STATION_MOCK = {
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
              tokenFees: [
                {
                  token: {
                    address: '0x1234567890abcdef1234567890abcdef12345678',
                    decimals: 6,
                    symbol: 'USDC',
                  },
                  balanceNeededToken: '0x12C4B0',
                  currentBalanceToken: '0x4C4B40',
                  feeRecipient: '0xBAB951a55b61dfAe21Ff7C3501142B397367F026',
                  rateWei: '0x216FF33813A80',
                },
                {
                  token: {
                    address: '0x01234567890abcdef1234567890abcdef1234567',
                    decimals: 3,
                    symbol: 'DAI',
                  },
                  balanceNeededToken: '0xC8A',
                  currentBalanceToken: '0x2710',
                  feeRecipient: '0xBAB951a55b61dfAe21Ff7C3501142B397367F026',
                  rateWei: '0x216FF33813A80',
                },
              ],
            },
          ],
          stateDiff: {},
          feeEstimate: 972988071597550,
          baseFeePerGas: 40482817574,
        },
      ],
      blockNumber: '0x1293669',
      id: 'faaab4c5-edf5-4077-ac75-8d26278ca2c5',
    },
  },
};

describe(
  SmokeConfirmationsRedesigned('Send native asset using EIP-7702'),
  () => {
    const testSpecificMock = async (
      mockServer: Mockttp,
      options: { success: boolean } = { success: true },
    ) => {
      const { success } = options;
      await setupMockRequest(mockServer, {
        requestMethod: 'GET',
        url: SIMULATION_ENABLED_NETWORKS_WITH_RELAY.urlEndpoint,
        response: SIMULATION_ENABLED_NETWORKS_WITH_RELAY.response,
        responseCode: 200,
      });
      await setupMockRequest(mockServer, {
        requestMethod: 'GET',
        url: `${LOCALHOST_SENTINEL_URL}/network`,
        response: SIMULATION_ENABLED_NETWORKS_WITH_RELAY.response,
        responseCode: 200,
      });
      await setupMockRequest(mockServer, {
        ...SIMULATION_GAS_STATION_MOCK,
        requestMethod: 'POST',
        url: `${LOCALHOST_SENTINEL_URL}/`,
        response: SIMULATION_GAS_STATION_MOCK.response,
        responseCode: 200,
      });
      await setupRemoteFeatureFlagsMock(
        mockServer,
        Object.assign({}, ...remoteFeatureEip7702),
      );
      await setupMockRequest(mockServer, {
        requestMethod: 'GET',
        url: `${TRANSACTION_RELAY_STATUS_NETWORKS_MOCK.urlEndpoint}`,
        response: {
          transactions: [
            {
              hash: TRANSACTION_RELAY_STATUS_NETWORKS_MOCK.response
                .transactions[0].hash,
              status: success ? RelayStatus.Success : 'FAILED',
            },
          ],
        },
        responseCode: 200,
      });
    };

    const fixtureBase = {
      fixture: new FixtureBuilder().withDisabledSmartTransactions().build(),
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
    };

    it('should send ETH via EIP-7702', async () => {
      await withFixtures(fixtureBase, async () => {
        const usdcValues = {
          fiatAmount: '$3.62',
          tokenAmount: '1.23 USDC',
          balance: 'Bal: $14.71 USD',
        };
        const daiValues = {
          fiatAmount: '$9.44',
          tokenAmount: '3.21 DAI',
          balance: 'Bal: $29.41 USD',
        };
        await loginToApp();
        await device.disableSynchronization();
        await WalletView.tapWalletSendButton();
        await SendView.selectEthereumToken();
        await SendView.pressAmountFiveButton();
        await SendView.pressContinueButton();
        await SendView.inputRecipientAddress(RECIPIENT_ADDRESS_MOCK);
        await SendView.pressReviewButton();

        await Assertions.expectElementToBeVisible(
          RowComponents.NetworkFeeGasFeeTokenArrow,
        );

        await TransactionConfirmView.tapGasFeeTokenPill();

        await GasFeeTokenModal.checkAmountFiat('DAI', daiValues.fiatAmount);
        await GasFeeTokenModal.checkAmountToken('DAI', daiValues.tokenAmount);
        await GasFeeTokenModal.checkBalance('DAI', daiValues.balance);

        await GasFeeTokenModal.checkAmountFiat('USDC', usdcValues.fiatAmount);
        await GasFeeTokenModal.checkAmountToken('USDC', usdcValues.tokenAmount);
        await GasFeeTokenModal.checkBalance('USDC', usdcValues.balance);
        await GasFeeTokenModal.tapToken('USDC');

        await Assertions.expectElementToBeVisible(
          Matchers.getElementByText('USDC'),
        );

        const symbolElement =
          (await RowComponents.NetworkFeeGasFeeTokenSymbol) as IndexableNativeElement;

        const symbolElementAttributes = await symbolElement.getAttributes();
        const symbolElementLabel = (
          symbolElementAttributes as { label: string }
        ).label;

        await Assertions.checkIfTextMatches(symbolElementLabel, 'USDC');
        await Assertions.expectTextDisplayed(usdcValues.fiatAmount);
        await Assertions.expectTextDisplayed('Includes $1.27 fee');

        await FooterActions.tapConfirmButton();
        await TabBarComponent.tapActivity();

        await Assertions.expectTextDisplayed('Confirmed');
      });
    });
  },
);
