import { CHAIN_IDS } from '@metamask/transaction-controller';
import Send from '.';
import { RootState } from '../../../../../reducers';
import { MOCK_KEYRING_CONTROLLER } from '../../../../../selectors/keyringController/testUtils';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_2,
} from '../../../../../util/test/accountsControllerTestUtils';
import { mockNetworkState } from '../../../../../util/test/network';
import {
  DeepPartial,
  renderScreen,
} from '../../../../../util/test/renderWithProvider';
import { SolScope } from '@metamask/keyring-api';

const mockedNetworkControllerState = mockNetworkState({
  chainId: CHAIN_IDS.MAINNET,
  id: 'mainnet',
  nickname: 'Ethereum Mainnet',
  ticker: 'ETH',
});

const initialState: DeepPartial<RootState> = {
  transaction: {
    transaction: {
      value: '',
      data: '0x0',
      from: MOCK_ADDRESS_2,
      gas: '',
      gasPrice: '',
      to: '0x2',
    },
    selectedAsset: { symbol: 'ETH' },
    assetType: undefined,
  },
  settings: {},
  engine: {
    backgroundState: {
      AccountTrackerController: {
        accounts: {
          [MOCK_ADDRESS_2]: {
            balance: '0x0',
          },
        },
        accountsByChainId: {
          64: {
            [MOCK_ADDRESS_2]: {
              balance: '0x0',
            },
          },
          1: {
            [MOCK_ADDRESS_2]: {
              balance: '0x0',
            },
          },
        },
      },
      AddressBookController: {
        addressBook: {},
      },
      TokenBalancesController: {
        tokenBalances: {},
      },
      TokenListController: {
        tokenList: { '0x1': {} },
      },
      PreferencesController: {
        featureFlags: {},
        ipfsGateway: 'https://dweb.link/ipfs/',
        lostIdentities: {},
        selectedAddress: MOCK_ADDRESS_2,
        useTokenDetection: true,
        useNftDetection: false,
        displayNftMedia: true,
        useSafeChainsListValidation: false,
        isMultiAccountBalancesEnabled: true,
        showTestNetworks: true,
        showIncomingTransactions: {
          '0x1': true,
          '0x5': true,
          '0x38': true,
          '0x61': true,
          '0xa': true,
          '0xa869': true,
          '0x89': true,
          '0x13881': true,
          '0xa86a': true,
          '0xfa': true,
          '0xfa2': true,
          '0xaa36a7': true,
          '0xe704': true,
          '0xe708': true,
          '0x504': true,
          '0x507': true,
          '0x505': true,
          '0x64': true,
        },
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      KeyringController: MOCK_KEYRING_CONTROLLER,
      NetworkController: {
        ...mockedNetworkControllerState,
      },
      NftController: {
        allNftContracts: {},
      },
      TokenRatesController: {
        marketData: {},
      },
      TransactionController: {
        methodData: {},
        transactions: [],
      },
      SmartTransactionsController: {
        smartTransactionsState: {
          liveness: true,
        },
      },
      GasFeeController: {
        gasFeeEstimates: {},
        estimatedGasFeeTimeBounds: {},
        gasEstimateType: 'none',
      },
      MultichainNetworkController: {
        isEvmSelected: true,
        selectedMultichainNetworkChainId: SolScope.Mainnet,
        multichainNetworkConfigurationsByChainId: {},
      },
    },
  },
};

jest.mock('../../../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../../../util/test/accountsControllerTestUtils');
  return {
    rejectPendingApproval: jest.fn(),
    context: {
      PreferencesController: {
        state: {
          securityAlertsEnabled: false,
        },
      },
      TokensController: {
        addToken: jest.fn(),
      },
      KeyringController: {
        state: {
          keyrings: [
            {
              accounts: ['0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756'],
              index: 0,
              type: 'HD Key Tree',
            },
          ],
        },
      },
      TransactionController: {
        estimateGas: jest.fn().mockImplementation(({ gas }) => {
          if (gas === undefined) return Promise.resolve({ gas: '0x5208' });
          return Promise.resolve({ gas });
        }),
        addTransaction: jest.fn().mockResolvedValue({
          result: {},
          transactionMeta: {
            id: 1,
          },
        }),
      },
      GasFeeController: {
        stopPolling: jest.fn(),
        getGasFeeEstimatesAndStartPolling: jest
          .fn()
          .mockResolvedValue('poll-token'),
      },
      NetworkController: {
        getProviderAndBlockTracker: jest.fn().mockImplementation(() => ({
          provider: {
            sendAsync: () => null,
          },
        })),
        getNetworkClientById: () => ({
          configuration: {
            chainId: '0x1',
            rpcUrl: 'https://mainnet.infura.io/v3',
            ticker: 'ETH',
            type: 'custom',
          },
        }),
        state: {
          ...mockedNetworkControllerState,
        },
      },
      AccountsController: {
        ...mockAccountsControllerState,
        state: mockAccountsControllerState,
      },
    },
  };
});

describe('Accounts', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      Send,
      { name: 'Send' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
