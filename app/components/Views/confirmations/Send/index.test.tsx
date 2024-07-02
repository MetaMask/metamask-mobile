import { renderScreen } from '../../../../util/test/renderWithProvider';
import Send from '.';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_1,
} from '../../../../util/test/accountsControllerTestUtils';

const initialState = {
  transaction: {
    transaction: {
      value: '',
      data: '0x0',
      from: '0x1',
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
      // ...initialBackgroundState,
      AccountTrackerController: {
        accounts: {
          [MOCK_ADDRESS_1]: {
            balance: '0x0',
          },
        },
        accountsByChainId: {
          64: {
            [MOCK_ADDRESS_1]: {
              balance: '0x0',
            },
          },
          1: {
            [MOCK_ADDRESS_1]: {
              balance: '0x0',
            },
          },
        },
        _U: 0,
        _V: 1,
        _X: null,
      },
      AddressBookController: {
        addressBook: {},
      },
      TokenBalancesController: {
        contractBalances: {},
      },
      TokenListController: {
        tokenList: [],
      },
      PreferencesController: {
        featureFlags: {},
        identities: {
          [MOCK_ADDRESS_1]: {
            address: MOCK_ADDRESS_1,
            name: 'Account 1',
            importTime: 1684232000456,
          },
        },
        ipfsGateway: 'https://cloudflare-ipfs.com/ipfs/',
        lostIdentities: {},
        selectedAddress: MOCK_ADDRESS_1,
        useTokenDetection: true,
        useNftDetection: false,
        displayNftMedia: true,
        useSafeChainsListValidation: false,
        isMultiAccountBalancesEnabled: true,
        disabledRpcMethodPreferences: {
          eth_sign: false,
        },
        showTestNetworks: true,
        _U: 0,
        _V: 1,
        _W: {
          featureFlags: {},
          frequentRpcList: [],
          identities: {
            [MOCK_ADDRESS_1]: {
              address: MOCK_ADDRESS_1,
              name: 'Account 1',
              importTime: 1684232000456,
            },
          },
          ipfsGateway: 'https://cloudflare-ipfs.com/ipfs/',
          lostIdentities: {},
          selectedAddress: MOCK_ADDRESS_1,
          useTokenDetection: true,
          useNftDetection: false,
          displayNftMedia: true,
          useSafeChainsListValidation: false,
          isMultiAccountBalancesEnabled: true,
          disabledRpcMethodPreferences: {
            eth_sign: false,
          },
          showTestNetworks: true,
          showIncomingTransactions: {
            '0x1': true,
            '0x5': true,
            '0x38': true,
            '0x61': true,
            '0xa': true,
            '0xa869': true,
            '0x1a4': true,
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
        _X: null,
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      NetworkController: {
        network: '1',
        providerConfig: {
          ticker: 'ETH',
          type: 'mainnet',
          chainId: '0x1',
        },
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
        internalTransactions: [],
        swapsTransactions: {},
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
    },
  },
};

jest.mock('../../../../core/Engine', () => ({
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
            accounts: [
              '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A',
              '0x519d2CE57898513F676a5C3b66496c3C394c9CC7',
              '0x07Be9763a718C0539017E2Ab6fC42853b4aEeb6B',
            ],
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
      state: {
        network: '1',
        providerConfig: {
          ticker: 'ETH',
          type: 'mainnet',
          chainId: '0x1',
        },
      },
    },
  },
}));

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
