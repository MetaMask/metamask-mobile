/* eslint-disable import/no-nodejs-modules */
import React from 'react';
import { shallow } from 'enzyme';
// eslint-disable-next-line import/named
import { NavigationContainer } from '@react-navigation/native';
import Main from './';
import { useSwapConfirmedEvent } from './RootRPCMethodsUI';
import { act } from '@testing-library/react-hooks';
import { MetaMetricsEvents } from '../../hooks/useMetrics';
import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

// Mock Ramp SDK dependencies to prevent SdkEnvironment.Production errors
jest.mock('../../../components/UI/Ramp', () => ({
  RampOrders: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../../components/UI/Ramp/Deposit/sdk', () => ({
  DepositSDKProvider: ({ children }: { children: React.ReactNode }) => children,
  DepositSDKContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

jest.mock('../../../components/UI/Ramp/Deposit/orderProcessor', () => ({}));

jest.mock('@consensys/native-ramps-sdk', () => ({
  SdkEnvironment: {
    Production: 'production',
    Staging: 'staging',
  },
  Context: {
    MobileIOS: 'mobile-ios',
    MobileAndroid: 'mobile-android',
  },
  NativeRampsSdk: jest.fn(),
}));

const mockSocialLoginUIChangesEnabled = jest.fn();
jest.mock('../../../util/onboarding', () => ({
  get SOCIAL_LOGIN_UI_CHANGES_ENABLED() {
    return mockSocialLoginUIChangesEnabled();
  },
}));

const mockNavigateTermsOfUse = jest.fn();
jest.mock('../../../util/termsOfUse/termsOfUse', () => ({
  __esModule: true,
  default: mockNavigateTermsOfUse,
}));

const mockStore = configureMockStore();
const mockInitialState = {
  user: {
    isConnectionRemoved: false,
  },
};

jest.mock('../../../core/Engine', () => ({
  controllerMessenger: {
    subscribeOnceIf: jest.fn(),
  },
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
      gas_included: false,
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
    const MainAppContainer = () => (
      <Provider store={mockStore(mockInitialState)}>
        <NavigationContainer>
          <Main />
        </NavigationContainer>
      </Provider>
    );
    const wrapper = shallow(<MainAppContainer />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly with isConnectionRemoved true', () => {
    const mockInitialStateWithConnectionRemoved = {
      user: {
        isConnectionRemoved: true,
      },
    };

    const MainAppContainer = () => (
      <Provider store={mockStore(mockInitialStateWithConnectionRemoved)}>
        <NavigationContainer>
          <Main />
        </NavigationContainer>
      </Provider>
    );
    const wrapper = shallow(<MainAppContainer />);
    expect(wrapper).toMatchSnapshot();
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

  describe('SOCIAL_LOGIN_UI_CHANGES_ENABLED functionality', () => {
    it('should not call termsOfUse when SOCIAL_LOGIN_UI_CHANGES_ENABLED is true', async () => {
      mockSocialLoginUIChangesEnabled.mockReturnValue(true);

      const MainAppContainer = () => (
        <Provider store={mockStore(mockInitialState)}>
          <NavigationContainer>
            <Main />
          </NavigationContainer>
        </Provider>
      );

      const wrapper = shallow(<MainAppContainer />);
      expect(wrapper).toMatchSnapshot();

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockNavigateTermsOfUse).not.toHaveBeenCalled();
    });
  });
});
