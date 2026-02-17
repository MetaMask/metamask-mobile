import React from 'react';
import TransactionElement from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Routes from '../../../constants/navigation/Routes';
import {
  TRANSACTION_DETAIL_EVENTS,
  TransactionDetailLocation,
} from '../../../core/Analytics/events/transactions';

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn(() => ({ name: 'test-event' }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: jest.fn(),
    }),
  };
});

jest.mock('../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkClientById: () => ({
        configuration: {
          chainId: '0x1',
          rpcUrl: 'https://mainnet.infura.io/v3',
          ticker: 'ETH',
          type: 'custom',
        },
      }),
      findNetworkClientIdByChainId: () => 'mainnet',
      setActiveNetwork: jest.fn(),
    },
    TokenListController: {
      state: {
        tokensChainsCache: {
          '0x1': {
            data: [],
          },
        },
      },
    },
  },
}));

jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  query: jest.fn(),
}));

jest.mock('./utils', () =>
  jest.fn().mockResolvedValue([
    { actionKey: 'Test Action', value: '0.1 ETH', fiatValue: '$100' },
    { summaryAmount: '0.1 ETH', summaryFiat: '$100' },
  ]),
);

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};
const store = mockStore(initialState);

describe('TransactionElement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders correctly', () => {
    const component = renderWithProvider(
      <Provider store={store}>
        <TransactionElement
          tx={{
            transaction: {
              to: '0x0',
              from: '0x1',
              nonce: 1,
            },
            chainId: '0x1',
            txParams: {
              to: '0x0',
              from: '0x1',
              status: 'CONFIRMED',
            },
          }}
        />
      </Provider>,
    );
    expect(component).toMatchSnapshot();
  });

  describe('MUSD conversion navigation', () => {
    it('navigates to TransactionDetails when transaction type is musdConversion', async () => {
      const musdConversionTx = {
        id: 'musd-tx-123',
        type: TransactionType.musdConversion,
        chainId: '0x1',
        status: 'confirmed',
        time: Date.now(),
        txParams: {
          to: '0x456',
          from: '0x123',
          nonce: '0x1',
        },
        metamaskPay: {
          chainId: '0x1',
          tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          tokenAmount: '1000000',
        },
      };

      const { getByText } = renderWithProvider(
        <Provider store={store}>
          <TransactionElement
            tx={musdConversionTx}
            navigation={{ navigate: mockNavigate }}
          />
        </Provider>,
      );

      // Wait for async decodeTransaction to complete and component to render
      await waitFor(() => {
        expect(getByText('Test Action')).toBeTruthy();
      });

      // Press the transaction element
      fireEvent.press(getByText('Test Action'));

      // First, navigation goes to TRANSACTIONS_VIEW to ensure correct context
      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);

      // Then after timeout, navigates to TRANSACTION_DETAILS
      jest.advanceTimersByTime(100);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTION_DETAILS, {
        transactionId: musdConversionTx.id,
      });
    });
  });

  describe('renderTxTime - "from this device" label', () => {
    it('renders "from this device" label with nonce when nonce exists', () => {
      const txWithNonce = {
        id: 'tx-with-nonce-123',
        chainId: '0x1',
        status: 'confirmed',
        time: Date.now(),
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        txParams: {
          to: '0x456',
          from: '0x123',
          nonce: '0x3', // nonce exists
        },
      };

      const component = renderWithProvider(
        <Provider store={store}>
          <TransactionElement
            tx={txWithNonce}
            selectedInternalAccount={{ address: '0x123' }}
            navigation={{ navigate: mockNavigate }}
          />
        </Provider>,
      );

      expect(component).toMatchSnapshot();
    });

    it('renders "from this device" label without nonce for EIP-7702 transactions', () => {
      const eip7702Tx = {
        id: 'eip7702-tx-123',
        chainId: '0x1',
        status: 'confirmed',
        time: Date.now(),
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        txParams: {
          to: '0x456',
          from: '0x123',
          // nonce is intentionally undefined for EIP-7702 transactions
        },
      };

      const component = renderWithProvider(
        <Provider store={store}>
          <TransactionElement
            tx={eip7702Tx}
            selectedInternalAccount={{ address: '0x123' }}
            navigation={{ navigate: mockNavigate }}
          />
        </Provider>,
      );

      // The component should render without "#NaN"
      expect(component).toMatchSnapshot();
    });

    it('renders date only when deviceConfirmedOn is not MM_MOBILE', () => {
      const txWithoutDevice = {
        id: 'tx-without-device-123',
        chainId: '0x1',
        status: 'confirmed',
        time: Date.now(),
        // deviceConfirmedOn is not set
        txParams: {
          to: '0x456',
          from: '0x123',
          nonce: '0x3',
        },
      };

      const component = renderWithProvider(
        <Provider store={store}>
          <TransactionElement
            tx={txWithoutDevice}
            selectedInternalAccount={{ address: '0x123' }}
            navigation={{ navigate: mockNavigate }}
          />
        </Provider>,
      );

      expect(component).toMatchSnapshot();
    });
  });

  describe('analytics tracking', () => {
    it('tracks Transaction Detail List Item Clicked when pressed', async () => {
      const tx = {
        id: 'tx-analytics-1',
        type: TransactionType.simpleSend,
        chainId: '0x1',
        status: 'confirmed',
        time: Date.now(),
        txParams: {
          to: '0x456',
          from: '0x123',
          nonce: '0x1',
        },
      };

      const { getByText } = renderWithProvider(
        <Provider store={store}>
          <TransactionElement tx={tx} navigation={{ navigate: mockNavigate }} />
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('Test Action')).toBeTruthy();
      });

      fireEvent.press(getByText('Test Action'));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        TRANSACTION_DETAIL_EVENTS.LIST_ITEM_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_type: expect.any(String),
          transaction_status: 'confirmed',
          location: TransactionDetailLocation.Home,
          chain_id_source: '0x1',
          chain_id_destination: '0x1',
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'test-event' });
    });

    it('tracks with asset_details location when provided', async () => {
      const tx = {
        id: 'tx-analytics-2',
        type: TransactionType.simpleSend,
        chainId: '0x1',
        status: 'submitted',
        time: Date.now(),
        txParams: {
          to: '0x456',
          from: '0x123',
          nonce: '0x2',
        },
      };

      const { getByText } = renderWithProvider(
        <Provider store={store}>
          <TransactionElement
            tx={tx}
            navigation={{ navigate: mockNavigate }}
            location={TransactionDetailLocation.AssetDetails}
          />
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('Test Action')).toBeTruthy();
      });

      fireEvent.press(getByText('Test Action'));

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          location: TransactionDetailLocation.AssetDetails,
        }),
      );
    });

    it('includes monetized_primitive for swap transactions', async () => {
      const swapTx = {
        id: 'tx-analytics-swap',
        type: TransactionType.swap,
        chainId: '0x1',
        status: 'confirmed',
        time: Date.now(),
        txParams: {
          to: '0x456',
          from: '0x123',
          nonce: '0x3',
        },
      };

      const { getByText } = renderWithProvider(
        <Provider store={store}>
          <TransactionElement
            tx={swapTx}
            navigation={{ navigate: mockNavigate }}
          />
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('Test Action')).toBeTruthy();
      });

      fireEvent.press(getByText('Test Action'));

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          monetized_primitive: 'swaps',
        }),
      );
    });
  });
});
