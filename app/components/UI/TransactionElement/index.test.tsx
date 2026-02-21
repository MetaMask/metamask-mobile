import React from 'react';
import TransactionElement from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { TransactionType } from '@metamask/transaction-controller';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Routes from '../../../constants/navigation/Routes';

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

      // Verify navigation to unified TransactionDetails screen
      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTION_DETAILS, {
        transactionId: musdConversionTx.id,
      });
    });
  });
});
