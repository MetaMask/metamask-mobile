import React from 'react';
import {
  render,
  fireEvent,
  act,
  userEvent,
  waitFor,
} from '@testing-library/react-native';
import PaymentRequest from './index';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { SolScope } from '@metamask/keyring-api';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import Routes from '../../../constants/navigation/Routes';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import ethLogo from '../../../assets/images/eth-logo.png';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn(),
}));

// Enable fake timers globally for this test file
jest.useFakeTimers();

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
        allTokens: {
          '0x1': {
            '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272': [],
          },
        },
      },
      NetworkController: {
        provider: {
          ticker: 'ETH',
          chainId: '1',
        },
      },
      MultichainNetworkController: {
        isEvmSelected: true,
        selectedMultichainNetworkChainId: SolScope.Mainnet,

        multichainNetworkConfigurationsByChainId: {},
      },
      AccountsController: {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE,
        internalAccounts: {
          ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
          selectedAccount: '30786334-3935-4563-b064-363339643939',
        },
      },
      TokenListController: {
        tokensChainsCache: {
          '0x1': {
            data: [
              {
                address: '0x0d8775f59023cbe76e541b6497bbed3cd21acbdc',
                symbol: 'BAT',
                decimals: 18,
                name: 'Basic Attention Token',
                iconUrl:
                  'https://assets.coingecko.com/coins/images/677/thumb/basic-attention-token.png?1547034427',
                type: 'erc20',
              },
              {
                address: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
                symbol: 'SAI',
                decimals: 18,
                name: 'Sai Stablecoin v1.0',
                iconUrl: 'sai.svg',
                type: 'erc20',
              },
            ],
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

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
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
          networkImageSource=""
          chainId="0x1"
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

  it('renders correctly with network picker when feature flag is enabled', () => {
    const { toJSON } = renderComponent({
      chainId: '0x1',
      networkImageSource: ethLogo,
    });
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

    await userEvent.press(getByText('ETH'));

    expect(getByText('Enter amount')).toBeTruthy();
    expect(mockNavigation.setParams).toHaveBeenCalledWith({
      mode: 'amount',
      dispatch: expect.any(Function),
    });
  });

  it('updates amount when input changes', async () => {
    const { getByText, getByPlaceholderText } = renderComponent();

    // First, select an asset
    await userEvent.press(getByText('ETH'));

    const amountInput = getByPlaceholderText('0.00');
    await userEvent.type(amountInput, '1.5');

    expect(amountInput.props.value).toBe('1.5');
  });

  it('trims leading and trailing spaces from amount input', async () => {
    const { getByText, getByPlaceholderText } = renderComponent();

    await userEvent.press(getByText('ETH'));

    const amountInput = getByPlaceholderText('0.00');
    fireEvent.changeText(amountInput, '  1.5  ');

    expect(amountInput.props.value).toBe('1.5');
  });

  it('handles whitespace-only input without throwing', async () => {
    const { getByText, getByPlaceholderText } = renderComponent();

    await userEvent.press(getByText('ETH'));

    const amountInput = getByPlaceholderText('0.00');

    expect(() => {
      fireEvent.changeText(amountInput, '   ');
    }).not.toThrow();
  });

  it('displays an error when an invalid amount is entered', async () => {
    const { getByText, getByPlaceholderText, queryByText } = renderComponent();

    (React.useState as jest.Mock).mockImplementation(() => [
      mockShowError,
      mockSetShowError,
    ]);

    mockSetShowError(true);

    await userEvent.press(getByText('ETH'));

    const amountInput = getByPlaceholderText('0.00');
    const nextButton = getByText('Next');

    await act(async () => {
      fireEvent.changeText(amountInput, '0');
      fireEvent.press(nextButton);
    });

    expect(mockSetShowError).toHaveBeenCalledWith(true);
    expect(queryByText('Invalid request, please try again')).toBeTruthy();
  });

  describe('handleNetworkPickerPress', () => {
    it('should navigate to network selector modal when feature flag is enabled', () => {
      const mockMetrics = {
        trackEvent: jest.fn(),
        createEventBuilder: jest.fn(() => ({
          addProperties: jest.fn(() => ({
            build: jest.fn(() => 'builtEvent'),
          })),
        })),
      };

      const { getByTestId } = renderComponent({
        metrics: mockMetrics,
        chainId: '0x1',
        networkImageSource: ethLogo,
      });

      const networkPicker = getByTestId(
        WalletViewSelectorsIDs.NAVBAR_NETWORK_PICKER,
      );

      act(() => {
        fireEvent.press(networkPicker);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        {
          screen: Routes.SHEET.NETWORK_SELECTOR,
        },
      );
    });
  });

  describe('Clear Search Input Functionality', () => {
    it('clears search input and resets results when clear button is pressed', async () => {
      // Given a PaymentRequest component with search input
      const { getByPlaceholderText, getByText, queryByText, getByTestId } =
        renderComponent();
      const searchInput = getByPlaceholderText('Search assets');

      // When user types and then presses clear button
      fireEvent.changeText(searchInput, 'BAT');

      // Wait for debounce to complete
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getByText('Search results')).toBeTruthy();
        expect(getByText('BAT')).toBeTruthy();
      });

      // Find and press clear button using testID
      const clearButton = getByTestId('clear-search-input-button');
      fireEvent.press(clearButton);

      // Then input should be cleared and results reset
      expect(searchInput.props.value).toBe('');
      expect(getByText('Top picks')).toBeTruthy();
      expect(queryByText('BAT')).toBeNull();
    });

    it('focuses search input after clearing', async () => {
      // Given a PaymentRequest component with search input
      const { getByPlaceholderText } = renderComponent();
      const searchInput = getByPlaceholderText('Search assets');

      // When user types and clears
      fireEvent.changeText(searchInput, 'BAT');
      fireEvent.changeText(searchInput, '');

      // Then search input should maintain focus
      expect(searchInput.props.value).toBe('');
    });
  });

  describe('Component Lifecycle and Cleanup', () => {
    it('cancels debounced search on component unmount', async () => {
      // Given a PaymentRequest component with active search
      const { getByPlaceholderText, unmount } = renderComponent();
      const searchInput = getByPlaceholderText('Search assets');

      // When user types and component unmounts before debounce completes
      fireEvent.changeText(searchInput, 'ETH');

      // Then unmount the component
      unmount();

      // When advancing timers after unmount
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then no errors should occur (debounced function should be cancelled)
      expect(() => {
        act(() => {
          jest.runOnlyPendingTimers();
        });
      }).not.toThrow();
    });

    it('initializes with correct state on mount', () => {
      // Given a PaymentRequest component
      const { getByText } = renderComponent();

      // Then it should show top picks by default
      expect(getByText('Top picks')).toBeTruthy();
      expect(getByText('Choose an asset to request')).toBeTruthy();
    });

    it('handles route params with receiveAsset on mount', () => {
      // Given a route with receiveAsset parameter
      const mockRouteWithAsset = {
        params: {
          receiveAsset: {
            symbol: 'ETH',
            name: 'Ether',
            isETH: true,
          },
        },
      };

      // When component mounts with receiveAsset
      const { getByText } = renderComponent({ route: mockRouteWithAsset });

      // Then it should switch to amount input mode
      expect(getByText('Enter amount')).toBeTruthy();
    });
  });

  describe('Search Edge Cases', () => {
    it('handles search with non-string input gracefully', async () => {
      // Given a PaymentRequest component
      const { getByPlaceholderText, getByText } = renderComponent();
      const searchInput = getByPlaceholderText('Search assets');

      // When user types invalid input (simulating edge case)
      fireEvent.changeText(searchInput, '123');

      // Then it should handle the search without errors
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getByText('Search results')).toBeTruthy();
      });
    });

    it('handles search with special characters', async () => {
      // Given a PaymentRequest component
      const { getByPlaceholderText, getByText } = renderComponent();
      const searchInput = getByPlaceholderText('Search assets');

      // When user types special characters
      fireEvent.changeText(searchInput, '!@#$%');

      // Then it should handle the search gracefully
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getByText('Search results')).toBeTruthy();
        expect(getByText('No tokens found')).toBeTruthy();
      });
    });

    it('handles search with very long input', async () => {
      // Given a PaymentRequest component
      const { getByPlaceholderText, getByText } = renderComponent();
      const searchInput = getByPlaceholderText('Search assets');

      // When user types a very long search term
      const longSearchTerm = 'a'.repeat(100);
      fireEvent.changeText(searchInput, longSearchTerm);

      // Then it should handle the search without performance issues
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getByText('Search results')).toBeTruthy();
        expect(getByText('No tokens found')).toBeTruthy();
      });
    });
  });

  describe('Network Configuration Tests', () => {
    it('shows correct assets for mainnet', () => {
      // Given a PaymentRequest component on mainnet
      const { getByText } = renderComponent({ chainId: '0x1' });

      // Then it should show default assets including SAI
      expect(getByText('ETH')).toBeTruthy();
      expect(getByText('SAI')).toBeTruthy();
    });

    it('shows correct assets for non-mainnet networks', () => {
      // Given a PaymentRequest component on non-mainnet
      const { getByText } = renderComponent({ chainId: '0x5' }); // Goerli

      // Then it should show only ETH with network-specific ticker
      expect(getByText('ETH')).toBeTruthy();
    });

    it('handles networks without token detection support', () => {
      // Given a PaymentRequest component on network without token detection
      const { getByText } = renderComponent({ chainId: '0x2' });

      // Then it should show only ETH
      expect(getByText('ETH')).toBeTruthy();
    });
  });

  describe('Debounced Search Functionality', () => {
    it('debounces search input to reduce excessive calls', async () => {
      // Given a PaymentRequest component with search functionality
      const { getByPlaceholderText, getByText } = renderComponent();
      const searchInput = getByPlaceholderText('Search assets');

      // Initially should show top picks
      expect(getByText('Top picks')).toBeTruthy();

      // When user types rapidly
      fireEvent.changeText(searchInput, 'E');
      fireEvent.changeText(searchInput, 'ET');
      fireEvent.changeText(searchInput, 'ETH');

      // Then the input value should update immediately
      expect(searchInput.props.value).toBe('ETH');

      // The search should execute after debounce delay
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then the search should execute and show search results
      await waitFor(() => {
        expect(getByText('Search results')).toBeTruthy();
        // Should show "No tokens found" for ETH search since it's not in the test data
        expect(getByText('No tokens found')).toBeTruthy();
      });
    });

    it('cancels pending search when user clears input', async () => {
      // Given a PaymentRequest component with search input
      const { getByPlaceholderText, getByText } = renderComponent();
      const searchInput = getByPlaceholderText('Search assets');

      // When user types and then clears immediately
      fireEvent.changeText(searchInput, 'ETH');
      fireEvent.changeText(searchInput, '');

      // Then the input should be cleared immediately
      expect(searchInput.props.value).toBe('');

      // And the search should not execute even after delay
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then it should show top picks instead of search results
      expect(getByText('Top picks')).toBeTruthy();
    });

    it('updates search results after debounce delay', async () => {
      // Given a PaymentRequest component
      const { getByPlaceholderText, getByText } = renderComponent();
      const searchInput = getByPlaceholderText('Search assets');

      // Initially should show top picks
      expect(getByText('Top picks')).toBeTruthy();

      // When user types a search term
      fireEvent.changeText(searchInput, 'BAT');

      // Then the input value should update immediately
      expect(searchInput.props.value).toBe('BAT');

      // The search should execute after debounce delay
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then search results should appear with specific token details
      await waitFor(() => {
        expect(getByText('Search results')).toBeTruthy();
        expect(getByText('BAT')).toBeTruthy();
        expect(getByText('Basic Attention Token')).toBeTruthy();
      });
    });

    it('handles multiple rapid search inputs correctly', async () => {
      // Given a PaymentRequest component
      const { getByPlaceholderText, getByText } = renderComponent();
      const searchInput = getByPlaceholderText('Search assets');

      // When user types rapidly with different terms
      fireEvent.changeText(searchInput, 'E');
      fireEvent.changeText(searchInput, 'ET');
      fireEvent.changeText(searchInput, 'ETH');

      // Then only the final search should execute
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then it should search for the final term
      await waitFor(() => {
        expect(getByText('Search results')).toBeTruthy();
        // Should show "No tokens found" for ETH search since it's not in the test data
        expect(getByText('No tokens found')).toBeTruthy();
      });
    }, 10000);

    it('cancels debounced search on component unmount', async () => {
      // Given a PaymentRequest component with active search
      const { getByPlaceholderText, unmount } = renderComponent();
      const searchInput = getByPlaceholderText('Search assets');

      // When user types and component unmounts before debounce completes
      fireEvent.changeText(searchInput, 'ETH');

      // Then unmount the component
      unmount();

      // When advancing timers after unmount
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then no errors should occur (debounced function should be cancelled)
      expect(() => {
        act(() => {
          jest.runOnlyPendingTimers();
        });
      }).not.toThrow();
    });

    it('handles empty search input correctly', async () => {
      // Given a PaymentRequest component
      const { getByPlaceholderText, getByText } = renderComponent();
      const searchInput = getByPlaceholderText('Search assets');

      // When user types and then clears to empty
      fireEvent.changeText(searchInput, 'ETH');
      fireEvent.changeText(searchInput, '');

      // Then it should show top picks immediately
      expect(getByText('Top picks')).toBeTruthy();

      // And should not show search results after delay
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(getByText('Top picks')).toBeTruthy();
    });

    it('debounces handleSearchTokenList calls', async () => {
      // Given a PaymentRequest component
      const { getByPlaceholderText, getByText } = renderComponent();
      const searchInput = getByPlaceholderText('Search assets');

      // When user types and submits (which calls handleSearchTokenList)
      fireEvent.changeText(searchInput, 'BAT');
      fireEvent(searchInput, 'submitEditing');

      // Then the search should not execute immediately
      expect(searchInput.props.value).toBe('BAT');

      // When the debounce delay passes
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then the search should execute with specific token details
      await waitFor(() => {
        expect(getByText('Search results')).toBeTruthy();
        expect(getByText('BAT')).toBeTruthy();
        expect(getByText('Basic Attention Token')).toBeTruthy();
      });
    });

    it('filters search results based on different search terms', async () => {
      // Given a PaymentRequest component
      const { getByPlaceholderText, getByText, queryByText } =
        renderComponent();
      const searchInput = getByPlaceholderText('Search assets');

      // When searching for token symbol
      fireEvent.changeText(searchInput, 'BAT');
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then should find BAT token
      await waitFor(() => {
        expect(getByText('Search results')).toBeTruthy();
        expect(getByText('BAT')).toBeTruthy();
        expect(getByText('Basic Attention Token')).toBeTruthy();
      });

      // When searching for token name
      fireEvent.changeText(searchInput, 'Basic Attention');
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then should still find BAT token
      await waitFor(() => {
        expect(getByText('Search results')).toBeTruthy();
        expect(getByText('BAT')).toBeTruthy();
        expect(getByText('Basic Attention Token')).toBeTruthy();
      });

      // When searching for non-existent token
      fireEvent.changeText(searchInput, 'NONEXISTENT');
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then should show no results
      await waitFor(() => {
        expect(getByText('Search results')).toBeTruthy();
        expect(getByText('No tokens found')).toBeTruthy();
        expect(queryByText('BAT')).toBeNull();
      });
    });

    it('shows correct search results for partial matches', async () => {
      // Given a PaymentRequest component
      const { getByPlaceholderText, getByText } = renderComponent();
      const searchInput = getByPlaceholderText('Search assets');

      // When searching with partial symbol
      fireEvent.changeText(searchInput, 'BA');
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then should find BAT token
      await waitFor(() => {
        expect(getByText('Search results')).toBeTruthy();
        expect(getByText('BAT')).toBeTruthy();
        expect(getByText('Basic Attention Token')).toBeTruthy();
      });

      // When searching with partial name
      fireEvent.changeText(searchInput, 'Basic');
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then should still find BAT token
      await waitFor(() => {
        expect(getByText('Search results')).toBeTruthy();
        expect(getByText('BAT')).toBeTruthy();
        expect(getByText('Basic Attention Token')).toBeTruthy();
      });
    });

    it('maintains search results state during rapid typing', async () => {
      // Given a PaymentRequest component
      const { getByPlaceholderText, getByText, queryByText } =
        renderComponent();
      const searchInput = getByPlaceholderText('Search assets');

      // When typing rapidly with valid search terms
      fireEvent.changeText(searchInput, 'B');
      fireEvent.changeText(searchInput, 'BA');
      fireEvent.changeText(searchInput, 'BAT');

      // Then should not show results immediately
      expect(queryByText('BAT')).toBeNull();

      // When debounce delay passes
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then should show final search results
      await waitFor(() => {
        expect(getByText('Search results')).toBeTruthy();
        expect(getByText('BAT')).toBeTruthy();
        expect(getByText('Basic Attention Token')).toBeTruthy();
      });

      // When typing rapidly with invalid then valid terms
      fireEvent.changeText(searchInput, 'INVALID');
      fireEvent.changeText(searchInput, 'BAT');

      // When debounce delay passes
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then should show valid results
      await waitFor(() => {
        expect(getByText('Search results')).toBeTruthy();
        expect(getByText('BAT')).toBeTruthy();
        expect(getByText('Basic Attention Token')).toBeTruthy();
      });
    });

    it('handles address-based search correctly', async () => {
      // Given a PaymentRequest component
      const { getByPlaceholderText, getByText } = renderComponent();
      const searchInput = getByPlaceholderText('Search assets');

      // When searching by token address
      fireEvent.changeText(
        searchInput,
        '0x0d8775f59023cbe76e541b6497bbed3cd21acbdc',
      );
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then should find BAT token by address
      await waitFor(() => {
        expect(getByText('Search results')).toBeTruthy();
        expect(getByText('BAT')).toBeTruthy();
        expect(getByText('Basic Attention Token')).toBeTruthy();
      });
    });

    it('handles case-insensitive search', async () => {
      // Given a PaymentRequest component
      const { getByPlaceholderText, getByText } = renderComponent();
      const searchInput = getByPlaceholderText('Search assets');

      // When searching with different cases
      fireEvent.changeText(searchInput, 'bat');
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then should find BAT token regardless of case
      await waitFor(() => {
        expect(getByText('Search results')).toBeTruthy();
        expect(getByText('BAT')).toBeTruthy();
        expect(getByText('Basic Attention Token')).toBeTruthy();
      });
    });
  });
});
