import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { TokenListItem } from './index';
import { mockTheme } from '../../../../../util/theme';
import { TextColor } from '../../../../../component-library/components/Texts/Text';

// Mock the dependencies
jest.mock('../../../../../util/theme', () => ({
  useTheme: () => mockTheme,
  mockTheme: {
    colors: {
      success: { default: '#28a745' },
      error: { default: '#dc3545' },
      text: { alternative: '#6c757d' },
    },
  },
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: () => ({
      addProperties: () => ({
        build: () => ({}),
      }),
    }),
  }),
}));

const createMockStore = (state = {}) => {
  const rootReducer = (state = {}) => state;
  return createStore(rootReducer, state);
};

const mockAssetKey = {
  address: '0x123',
  chainId: '0x1',
  isStaked: false,
};

const defaultMockState = {
  settings: {
    primaryCurrency: 'ETH',
    showFiatInTestnets: true,
  },
  engine: {
    backgroundState: {
      TokenRatesController: {
        marketData: {
          '0x1': {
            '0x123': {
              price: 100,
              pricePercentChange1d: 5.5,
            },
          },
        },
      },
      TokenBalancesController: {
        tokenBalances: {
          '0xuser': {
            '0x1': {
              '0x123': '0x1000',
            },
          },
        },
      },
      CurrencyRateController: {
        currencyRates: {
          ETH: {
            conversionRate: 2000,
          },
        },
        currentCurrency: 'USD',
      },
      MultichainNetworkController: {
        selectedNetworkClientId: 'mainnet',
      },
      AccountsController: {
        internalAccounts: {
          accounts: {
            account1: {
              id: 'account1',
              address: '0xuser',
            },
          },
          selectedAccount: 'account1',
        },
      },
    },
  },
};

describe('TokenListItem', () => {
  let mockUseSelector: jest.Mock;

  beforeEach(() => {
    mockUseSelector = require('react-redux').useSelector;
    mockUseSelector.mockImplementation((selector: any) => {
      return selector(defaultMockState);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    assetKey: mockAssetKey,
    showRemoveMenu: jest.fn(),
    setShowScamWarningModal: jest.fn(),
    privacyMode: false,
    showPercentageChange: true,
  };

  it('applies success color for positive percentage change', () => {
    // Mock state with positive percentage change
    const stateWithPositiveChange = {
      ...defaultMockState,
      engine: {
        ...defaultMockState.engine,
        backgroundState: {
          ...defaultMockState.engine.backgroundState,
          TokenRatesController: {
            marketData: {
              '0x1': {
                '0x123': {
                  price: 100,
                  pricePercentChange1d: 8.61,
                },
              },
            },
          },
        },
      },
    };

    mockUseSelector.mockImplementation((selector: any) => {
      return selector(stateWithPositiveChange);
    });

    const store = createMockStore(stateWithPositiveChange);
    const { getByTestId } = render(
      <Provider store={store}>
        <TokenListItem {...defaultProps} />
      </Provider>,
    );

    const secondaryBalance = getByTestId('secondary-balance-text');
    expect(secondaryBalance.props.style).toMatchObject({
      color: mockTheme.colors.success.default,
    });
    expect(secondaryBalance.props.children).toBe('+8.61%');
  });

  it('applies error color for negative percentage change', () => {
    // Mock state with negative percentage change
    const stateWithNegativeChange = {
      ...defaultMockState,
      engine: {
        ...defaultMockState.engine,
        backgroundState: {
          ...defaultMockState.engine.backgroundState,
          TokenRatesController: {
            marketData: {
              '0x1': {
                '0x123': {
                  price: 100,
                  pricePercentChange1d: -3.25,
                },
              },
            },
          },
        },
      },
    };

    mockUseSelector.mockImplementation((selector: any) => {
      return selector(stateWithNegativeChange);
    });

    const store = createMockStore(stateWithNegativeChange);
    const { getByTestId } = render(
      <Provider store={store}>
        <TokenListItem {...defaultProps} />
      </Provider>,
    );

    const secondaryBalance = getByTestId('secondary-balance-text');
    expect(secondaryBalance.props.style).toMatchObject({
      color: mockTheme.colors.error.default,
    });
    expect(secondaryBalance.props.children).toBe('-3.25%');
  });

  it('applies alternative color for zero percentage change', () => {
    // Mock state with zero percentage change
    const stateWithZeroChange = {
      ...defaultMockState,
      engine: {
        ...defaultMockState.engine,
        backgroundState: {
          ...defaultMockState.engine.backgroundState,
          TokenRatesController: {
            marketData: {
              '0x1': {
                '0x123': {
                  price: 100,
                  pricePercentChange1d: 0,
                },
              },
            },
          },
        },
      },
    };

    mockUseSelector.mockImplementation((selector: any) => {
      return selector(stateWithZeroChange);
    });

    const store = createMockStore(stateWithZeroChange);
    const { getByTestId } = render(
      <Provider store={store}>
        <TokenListItem {...defaultProps} />
      </Provider>,
    );

    const secondaryBalance = getByTestId('secondary-balance-text');
    expect(secondaryBalance.props.style).toMatchObject({
      color: mockTheme.colors.text.alternative,
    });
    expect(secondaryBalance.props.children).toBe('0.00%');
  });

  it('does not show percentage when showPercentageChange is false', () => {
    const store = createMockStore(defaultMockState);
    const { queryByTestId } = render(
      <Provider store={store}>
        <TokenListItem {...defaultProps} showPercentageChange={false} />
      </Provider>,
    );

    const secondaryBalance = queryByTestId('secondary-balance-text');
    expect(secondaryBalance).toBeNull();
  });

  it('shows token amount on left side below token name', () => {
    const store = createMockStore(defaultMockState);
    const { getByText } = render(
      <Provider store={store}>
        <TokenListItem {...defaultProps} />
      </Provider>,
    );

    // Should show token amount in the left section
    expect(getByText('0.001 ETH')).toBeTruthy(); // Assuming this converts from hex
  });

  it('displays fiat value as main balance', () => {
    const store = createMockStore(defaultMockState);
    const { getByTestId } = render(
      <Provider store={store}>
        <TokenListItem {...defaultProps} />
      </Provider>,
    );

    const mainBalance = getByTestId('balance-text');
    expect(mainBalance.props.children).toContain('$'); // Should show fiat
  });
});
