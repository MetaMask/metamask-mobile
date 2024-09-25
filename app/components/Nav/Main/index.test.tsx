/* eslint-disable import/no-nodejs-modules */
import React from 'react';
import { render } from '@testing-library/react-native';
// eslint-disable-next-line import/named
import { NavigationContainer } from '@react-navigation/native';
import Main from './';
import { useSwapConfirmedEvent } from './RootRPCMethodsUI';
import { act } from '@testing-library/react-hooks';
import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import { Provider, useSelector } from 'react-redux';
import configureStore from 'redux-mock-store';
import { selectProviderConfig } from '../../../selectors/networkController';
import { selectNetworkName } from '../../../selectors/networkInfos';
import { ThemeContext, mockTheme } from '../../../util/theme';
import Engine from '../../../core/Engine';
import { mockNetworkState } from '../../../util/test/network';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { AuthorizationStatus } from '@notifee/react-native';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../core/Engine.ts', () => ({
  getTotalFiatAccountBalance: jest.fn(),
  controllerMessenger: {
    subscribeOnceIf: jest.fn(),
  },
  context: {
    KeyringController: {
      state: {
        keyrings: [
          {
            accounts: ['0xd018538C87232FF95acbCe4870629b75640a78E7'],
          },
        ],
      },
    },
  },
}));

const mockStore = configureStore([]);
const store = mockStore({
  engine: {
    backgroundState: {
      CurrencyRateController: {
        conversionRate: 1,
        currentCurrency: 'USD',
      },
      TokenRatesController: {
        contractExchangeRates: {},
        marketData: {
          '0x1': {
            '0x0d8775f59023cbe76e541b6497bbed3cd21acbdc': {
              price: 1,
            },
          },
        },
      },
      TokensController: {
        marketData: {
          '0x1': {
            '0x0d8775f59023cbe76e541b6497bbed3cd21acbdc': {
              price: 1,
            },
          },
        },
        tokens: [],
      },
      NetworkController: {
        ...mockNetworkState({
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
          chainId: CHAIN_IDS.MAINNET,
        }),
      },
      AccountsController: {
        internalAccounts: {
          accounts: {
            '30313233-3435-4637-b839-383736353430': {
              // Lower case address to test edge case
              address: '0xd018538c87232ff95acbce4870629b75640a78e7',
              id: '30313233-3435-4637-b839-383736353430',
              options: {},
              metadata: {
                name: 'Account 1',
                keyring: {
                  type: 'HD Key Tree',
                },
              },
              methods: [
                'personal_sign',
                'eth_signTransaction',
                'eth_signTypedData_v1',
                'eth_signTypedData_v3',
                'eth_signTypedData_v4',
              ],
              type: 'eip155:eoa',
            },
          },
          selectedAccount: '30313233-3435-4637-b839-383736353430',
        },
      },
      AccountTrackerController: {
        accounts: {
          '0x0d8775f59023cbe76e541b6497bbed3cd21acbdc': {
            balance: '0x0',
          },
        },
      },
      AuthenticationController: {
        isSignedIn: true,
      },
      TokenListController: {
        tokenList: {
          '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f': {
            address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
            symbol: 'SNX',
            decimals: 18,
            name: 'Synthetix Network Token',
            iconUrl:
              'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f.png',
            type: 'erc20',
            aggregators: [
              'Aave',
              'Bancor',
              'CMC',
              'Crypto.com',
              'CoinGecko',
              '1inch',
              'PMM',
              'Synthetix',
              'Zerion',
              'Lifi',
            ],
            occurrences: 10,
            fees: {
              '0x5fd79d46eba7f351fe49bff9e87cdea6c821ef9f': 0,
              '0xda4ef8520b1a57d7d63f1e249606d1a459698876': 0,
            },
          },
        },
        tokensChainsCache: {},
        preventPollingOnNetworkRestart: false,
      },
      NotificationServicesController: {
        isNotificationServicesEnabled: true,
        metamaskNotificationsList: [],
      },
      UserStorageController: {
        isProfileSyncingEnabled: true,
      },
      SmartTransactionsController: {
        smartTransactionsState: {
          fees: {},
          feesByChainId: {
            '0x1': {},
            '0xaa36a7': {},
          },
          liveness: true,
          livenessByChainId: {
            '0x1': true,
            '0xaa36a7': true,
          },
          smartTransactions: {
            '0x1': [],
          },
        },
      },
      SnapController: {
        snaps: {},
      },
      TransactionController: {
        transactions: [
          {
            chainId: '5',
            id: '1',
            origin: 'test.com',
            status: 'confirmed',
            time: 1631714312,
            transaction: {
              from: '0x1',
            },
            transactionHash: '0x2',
            rawTransaction: '0x3',
          },
          {
            chainId: '5',
            id: '2',
            origin: 'test.com',
            status: 'confirmed',
            time: 1631714312,
            transaction: {
              from: '0x1',
            },
            transactionHash: '0x2',
          },
          {
            chainId: '1',
            id: '3',
            origin: 'test2.com',
            status: 'submitted',
            time: 1631714313,
            transaction: {
              from: '0x6',
            },
            transactionHash: '0x4',
            rawTransaction: '0x5',
          },
        ],
      },
      TokenBalancesController: {
        contractBalances: {
          address: '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95',
          symbol: 'TST',
          decimals: 4,
        },
      },
      NftController: {
        allNfts: [],
      },
      KeyringController: {
        keyrings: [],
      },
      PreferencesController: {
        ipfsGateway: {},
      },
    },
  },
  settings: {
    primaryCurrency: 'ETH',
  },
  user: {
    backUpSeedphraseVisible: false,
    passwordSet: true,
    seedphraseBackedUp: true,
  },
  security: {
    hasUserSelectedAutomaticSecurityCheckOption: false,
    pin: {
      isPinSet: true,
    },
  },
  legalNotices: {
    newPrivacyPolicyToastShownDate: null,
    newPrivacyPolicyToastClickedOrClosed: false,
  },
  navigation: {
    currentRoute: 'Home',
  },
  modals: {
    networkModalVisible: false,
    infoNetworkModalVisible: false,
  },
  wizard: {},
  networkOnboarded: {
    switchedNetwork: false,
  },
  browser: {
    tabs: [{ url: 'https://metamask.io' }],
  },
  alert: {
    isVisible: false,
    autodismiss: false,
    content: null,
    data: null,
  },
  fiatOrders: {
    networks: [
      {
        active: true,
        chainId: '1',
        nativeTokenSupported: true,
      },
    ],
  },
  swaps: { '0x1': { isLive: true }, hasOnboarded: false, isLive: true },
  notification: {
    permissions: {
      authorizationStatus: AuthorizationStatus.AUTHORIZED,
    },
    notifications: [],
  },
});

const TRANSACTION_META_ID_MOCK = '04541dc0-2e69-11ef-b995-33aef2c88d1e';

const SWAP_TRANSACTIONS_MOCK = {
  [TRANSACTION_META_ID_MOCK]: {
    action: 'swap',
    analytics: {
      available_quotes: 5,
      best_quote_source: 'oneInchV5',
      chain_id: '1',
      custom_slippage: false,
      network_fees_ETH: '0.00337',
      network_fees_USD: '$12.04',
      other_quote_selected: false,
      request_type: 'Order',
      token_from: 'ETH',
      token_from_amount: '0.001254',
      token_to: 'USDC',
      token_to_amount: '4.440771',
    },
    destinationAmount: '4440771',
    destinationToken: {
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      decimals: 6,
    },
    paramsForAnalytics: {
      approvalTransactionMetaId: {},
      ethAccountBalance: '0xedfffbea734a07',
      gasEstimate: '0x33024',
      sentAt: '0x66732203',
    },
    sourceAmount: '1254000000000000',
    sourceAmountInFiat: '$4.47',
    sourceToken: {
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
    },
  },
};

function renderUseSwapConfirmedEventHook({
  swapsTransactions,
  trackSwaps,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  swapsTransactions: any;
  trackSwaps?: jest.Func;
}) {
  const finalTrackSwaps = trackSwaps || jest.fn();

  const { result } = renderHookWithProvider(
    () =>
      useSwapConfirmedEvent({
        trackSwaps: finalTrackSwaps,
      }),
    {
      state: {
        engine: {
          backgroundState: {
            TransactionController: {
              //@ts-expect-error - swaps transactions is something we do not have implemented on TransacitonController yet
              swapsTransactions,
            },
          },
        },
      },
    },
  );

  return result;
}

const ThemeWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeContext.Provider value={mockTheme}>{children}</ThemeContext.Provider>
);

describe('Main', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    Engine.getTotalFiatAccountBalance.mockReturnValue({
      ethFiat: 100,
      tokenFiat: 50,
    });
  });

  it('should render correctly', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectProviderConfig) {
        return { chainId: '1' };
      }
      if (selector === selectNetworkName) {
        return 'Mainnet';
      }
      if (typeof selector === 'function') {
        return selector(store.getState());
      }

      return undefined;
    });
    const MainAppContainer = () => (
      <ThemeWrapper>
        <Provider store={store}>
          <NavigationContainer>
            <Main />
          </NavigationContainer>
        </Provider>
      </ThemeWrapper>
    );
    const { toJSON } = render(<MainAppContainer />);
    expect(toJSON()).toMatchSnapshot();
  });

  describe('useSwapConfirmedEvent', () => {
    it('queues transactionMeta ids correctly', () => {
      const result = renderUseSwapConfirmedEventHook({
        swapsTransactions: {},
      });

      act(() => {
        result.current.addTransactionMetaIdForListening(
          TRANSACTION_META_ID_MOCK,
        );
      });

      expect(result.current.transactionMetaIdsForListening).toEqual([
        TRANSACTION_META_ID_MOCK,
      ]);
    });
  });
});
