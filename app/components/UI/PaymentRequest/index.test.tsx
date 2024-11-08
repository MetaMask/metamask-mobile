import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import PaymentRequest from './index';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn(),
}));

const mockStore = configureMockStore();

const initialState = {
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
        ...MOCK_ACCOUNTS_CONTROLLER_STATE,
        internalAccounts: {
          ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
          selectedAccount: {},
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
      },
      PreferencesController: {
        ipfsGateway: {},
      },
    },
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};

let mockSetShowError: jest.Mock;
let mockShowError = false;

beforeEach(() => {
  mockSetShowError = jest.fn((value) => {
    mockShowError = value;
  });
  (React.useState as jest.Mock).mockImplementation((state) => [
    state,
    mockSetShowError,
  ]);
});

const store = mockStore(initialState);

const mockNavigation = {
  setOptions: jest.fn(),
  setParams: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const mockRoute = {
  params: {
    dispatch: jest.fn(),
  },
};

const renderComponent = (props = {}) =>
  render(
    <Provider store={store}>
      <ThemeContext.Provider value={mockTheme}>
        <PaymentRequest
          navigation={mockNavigation}
          route={mockRoute}
          {...props}
        />
      </ThemeContext.Provider>
    </Provider>,
  );

describe('PaymentRequest', () => {
  it('renders correctly', () => {
    const { toJSON } = renderComponent();
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays the correct title for asset selection', () => {
    const { getByText } = renderComponent();
    expect(getByText('Choose an asset to request')).toBeTruthy();
  });

  it('allows searching for assets', () => {
    const { getByPlaceholderText } = renderComponent();
    const searchInput = getByPlaceholderText('Search assets');
    fireEvent.changeText(searchInput, 'ETH');
    expect(searchInput.props.value).toBe('ETH');
  });

  it('switches to amount input mode when an asset is selected', async () => {
    const { getByText } = renderComponent({ navigation: mockNavigation });

    await act(async () => {
      fireEvent.press(getByText('ETH'));
    });

    expect(getByText('Enter amount')).toBeTruthy();
    expect(mockNavigation.setParams).toHaveBeenCalledWith({
      mode: 'amount',
      dispatch: expect.any(Function),
    });
  });

  it('updates amount when input changes', async () => {
    const { getByText, getByPlaceholderText } = renderComponent();

    // First, select an asset
    await act(async () => {
      fireEvent.press(getByText('ETH'));
    });

    const amountInput = getByPlaceholderText('0.00');
    await act(async () => {
      fireEvent.changeText(amountInput, '1.5');
    });

    expect(amountInput.props.value).toBe('1.5');
  });

  it('displays an error when an invalid amount is entered', async () => {
    const { getByText, getByPlaceholderText, debug, queryByText } =
      renderComponent();

    (React.useState as jest.Mock).mockImplementation(() => [
      mockShowError,
      mockSetShowError,
    ]);

    mockSetShowError(true);

    await act(async () => {
      fireEvent.press(getByText('ETH'));
    });

    const amountInput = getByPlaceholderText('0.00');
    const nextButton = getByText('Next');

    await act(async () => {
      fireEvent.changeText(amountInput, '0');
      fireEvent.press(nextButton);
    });

    debug();

    expect(mockSetShowError).toHaveBeenCalledWith(true);
    expect(queryByText('Invalid request, please try again')).toBeTruthy();
  });
});
