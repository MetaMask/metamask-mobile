/* eslint-disable import/no-nodejs-modules */
import React from 'react';
import { render } from '@testing-library/react-native';
// eslint-disable-next-line import/named
import { NavigationContainer } from '@react-navigation/native';
import Main from './';
import { useSwapConfirmedEvent } from './RootRPCMethodsUI';
import { act } from '@testing-library/react-hooks';
import { MetaMetricsEvents } from '../../hooks/useMetrics';
import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import { Provider, useSelector } from 'react-redux';
import configureStore from 'redux-mock-store';
import { selectProviderConfig } from '../../../selectors/networkController';
import { selectNetworkName } from '../../../selectors/networkInfos';

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
        provider: {
          ticker: 'ETH',
          chainId: '1',
        },
      },
      AccountsController: {
        selectedAddress: '0x0d8775f59023cbe76e541b6497bbed3cd21acbdc',
        internalAccounts: {
          accounts: [
            {
              accountId: '1',
              address: '0x0d8775f59023cbe76e541b6497bbed3cd21acbdc',
              name: 'Internal Account 1',
              balance: 100,
            },
          ],
        },
        selectedInternalAccount: {
          address: '0x0d8775f59023cbe76e541b6497bbed3cd21acbdc',
        },
      },

      AccountTrackerController: {
        accounts: {
          '0x0d8775f59023cbe76e541b6497bbed3cd21acbdc': {
            balance: '0x0',
          },
        },
      },
      TokenListController: {
        tokenList: {
          '0x1': {
            '0x0d8775f59023cbe76e541b6497bbed3cd21acbdc': {
              address: '0x0d8775f59023cbe76e541b6497bbed3cd21acbdc',
              symbol: 'BAT',
              decimals: 18,
              name: 'Basic Attention Token',
              iconUrl:
                'https://assets.coingecko.com/coins/images/677/thumb/basic-attention-token.png?1547034427',
              type: 'erc20',
            },
          },
        },
        contractBalances: {},
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
});

jest.mock('../../../core/Engine.ts', () => ({
  controllerMessenger: {
    subscribeOnceIf: jest.fn(),
  },
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

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

describe('Main', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should render correctly', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectProviderConfig) {
        return { chainId: '1' };
      }
      if (selector === selectNetworkName) {
        return 'Mainnet';
      }
      return undefined;
    });
    const MainAppContainer = () => (
      <Provider store={store}>
        <NavigationContainer>
          <Main />
        </NavigationContainer>
      </Provider>
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

    it('adds a listener for transaction confirmation on the TransactionController', () => {
      const result = renderUseSwapConfirmedEventHook({
        swapsTransactions: SWAP_TRANSACTIONS_MOCK,
      });

      act(() => {
        result.current.addTransactionMetaIdForListening(
          TRANSACTION_META_ID_MOCK,
        );
      });

      expect(Engine.controllerMessenger.subscribeOnceIf).toHaveBeenCalledTimes(
        1,
      );
    });

    it('tracks Swap Confirmed after transaction confirmed', () => {
      const trackSwaps = jest.fn();

      const txMeta = {
        id: TRANSACTION_META_ID_MOCK,
      };

      const result = renderUseSwapConfirmedEventHook({
        swapsTransactions: SWAP_TRANSACTIONS_MOCK,
        trackSwaps,
      });

      act(() => {
        result.current.addTransactionMetaIdForListening(
          TRANSACTION_META_ID_MOCK,
        );
      });

      jest
        .mocked(Engine.controllerMessenger.subscribeOnceIf)
        .mock.calls[0][1](txMeta as never);

      expect(trackSwaps).toHaveBeenCalledWith(
        MetaMetricsEvents.SWAP_COMPLETED,
        txMeta,
        SWAP_TRANSACTIONS_MOCK,
      );
    });

    it('removes transactionMeta id after tracking', () => {
      const trackSwaps = jest.fn();

      const txMeta = {
        id: TRANSACTION_META_ID_MOCK,
      };

      const result = renderUseSwapConfirmedEventHook({
        swapsTransactions: SWAP_TRANSACTIONS_MOCK,
        trackSwaps,
      });

      act(() => {
        result.current.addTransactionMetaIdForListening(
          TRANSACTION_META_ID_MOCK,
        );
      });

      jest
        .mocked(Engine.controllerMessenger.subscribeOnceIf)
        .mock.calls[0][1](txMeta as never);

      expect(result.current.transactionMetaIdsForListening).toEqual([]);
    });
  });
});
