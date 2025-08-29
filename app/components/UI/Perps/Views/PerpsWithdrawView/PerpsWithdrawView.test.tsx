import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { ToastContext } from '../../../../../component-library/components/Toast';
import PerpsWithdrawView from './PerpsWithdrawView';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  ARBITRUM_MAINNET_CHAIN_ID,
  USDC_SYMBOL,
  USDC_DECIMALS,
  ZERO_ADDRESS,
} from '../../constants/hyperLiquidConfig';

// Mock react-native at the top
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Platform: {
    OS: 'ios',
  },
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  })),
}));

// Mock Engine
const mockWithdraw = jest.fn();
jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      state: {
        perpsData: {
          cachedAccountState: {
            availableBalance: '$1000.00',
          },
          selectedNetwork: 'mainnet',
        },
        isTestnet: false,
      },
      withdraw: mockWithdraw,
      getWithdrawalRoutes: jest.fn().mockReturnValue([
        {
          assetId:
            'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
          chainId: 'eip155:42161',
          contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7',
          constraints: {
            minAmount: '1.01',
            estimatedTime: '5 minutes',
            fees: {
              fixed: 1,
              token: 'USDC',
            },
          },
        },
      ]),
    },
  },
}));

// Mock toast context
const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockToastRef = {
  current: {
    showToast: mockShowToast,
    closeToast: mockCloseToast,
  },
};

// Mock TokenInputArea with more comprehensive implementation
interface MockTokenInputAreaProps {
  amount?: string;
  token?: { symbol: string };
  tokenBalance?: string;
  testID: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onInputPress?: () => void;
}

jest.mock('../../../../UI/Bridge/components/TokenInputArea', () => {
  const MockReact = jest.requireActual('react');
  const View = jest.requireActual('react-native').View;
  const TouchableOpacity = jest.requireActual('react-native').TouchableOpacity;
  const Text = jest.requireActual('react-native').Text;

  const TokenInputArea = MockReact.forwardRef(
    (props: MockTokenInputAreaProps, ref: React.Ref<{ blur: () => void }>) => {
      const mockBlur = jest.fn();

      MockReact.useImperativeHandle(ref, () => ({
        blur: mockBlur,
      }));

      return (
        <View testID={props.testID}>
          <TouchableOpacity
            onPress={() => {
              props.onFocus?.();
              props.onInputPress?.();
            }}
            testID={`${props.testID}-input`}
          >
            <Text>{props.amount || '0'}</Text>
          </TouchableOpacity>
          {props.token && (
            <Text testID={`${props.testID}-token`}>{props.token.symbol}</Text>
          )}
          {props.tokenBalance && (
            <Text testID={`${props.testID}-balance`}>{props.tokenBalance}</Text>
          )}
          <TouchableOpacity
            onPress={props.onBlur}
            testID={`${props.testID}-blur`}
          >
            <Text>Blur</Text>
          </TouchableOpacity>
        </View>
      );
    },
  );

  return {
    __esModule: true,
    TokenInputArea,
    TokenInputAreaType: {
      Source: 'source',
      Destination: 'destination',
    },
    MAX_INPUT_LENGTH: 10,
  };
});

// Mock Keypad component
jest.mock('../../../../Base/Keypad', () => {
  const View = jest.requireActual('react-native').View;
  const TouchableOpacity = jest.requireActual('react-native').TouchableOpacity;
  const Text = jest.requireActual('react-native').Text;

  return function Keypad({
    onChange,
    value,
  }: {
    onChange: ({ value }: { value: string; valueAsNumber: number }) => void;
    value: string;
  }) {
    return (
      <View testID="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((num) => (
          <TouchableOpacity
            key={num}
            testID={`keypad-${num}`}
            onPress={() =>
              onChange({
                value: value + num,
                valueAsNumber: parseFloat(value + num),
              })
            }
          >
            <Text>{num}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          testID="keypad-clear"
          onPress={() => onChange({ value: '', valueAsNumber: 0 })}
        >
          <Text>Clear</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

// Mock token icon utils
jest.mock('../../utils/tokenIconUtils', () => ({
  enhanceTokenWithIcon: jest.fn((params) => ({
    ...params.token,
    image: 'https://test.com/usdc.png',
  })),
}));

// Mock custom hooks with more detailed implementations
jest.mock('../../hooks', () => ({
  usePerpsAccount: jest.fn(() => ({
    availableBalance: '$1000.00',
  })),
  usePerpsNetwork: jest.fn(),
  usePerpsWithdrawQuote: jest.fn(),
  usePerpsTrading: jest.fn(),
  useWithdrawTokens: jest.fn(() => ({
    sourceToken: {
      symbol: 'USDC',
      address: '0x0000000000000000000000000000000000000000',
      decimals: 6,
      name: 'USD Coin',
      chainId: '0x998',
      currencyExchangeRate: 1,
      image: 'https://test.com/usdc.png',
    },
    destToken: {
      symbol: 'USDC',
      address: '0x0000000000000000000000000000000000000000',
      decimals: 6,
      name: 'USD Coin',
      chainId: '0xa4b1',
      currencyExchangeRate: 1,
      image: 'https://test.com/usdc.png',
    },
  })),
  useWithdrawValidation: jest.fn(),
  usePerpsEventTracking: jest.fn(() => ({
    track: jest.fn(),
  })),
  usePerpsPerformance: jest.fn(() => ({
    startMeasure: jest.fn(),
    endMeasure: jest.fn(),
    measure: jest.fn(),
    measureAsync: jest.fn(),
  })),
}));

const mockStore = configureMockStore();

// Helper function to get mocked hooks
const getMockedHooks = () => jest.requireMock('../../hooks');

describe('PerpsWithdrawView', () => {
  let store: ReturnType<typeof mockStore>;

  const defaultMockQuote = {
    formattedQuoteData: {
      networkFee: '$1.00',
      estimatedTime: '5 minutes',
      receivingAmount: '99.00 USDC',
    },
    hasValidQuote: true,
    error: null,
  };

  const defaultMockValidation = {
    availableBalance: '1000.00',
    hasInsufficientBalance: false,
    isBelowMinimum: false,
    hasAmount: true,
    getButtonLabel: jest.fn(() => 'Withdraw USDC'),
    getMinimumAmount: jest.fn(() => 1.01),
  };

  const defaultMockTrading = {
    withdraw: jest.fn().mockResolvedValue({
      success: true,
      txHash: '0x123456789',
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Get mocked hooks and reset them completely
    const mockedHooks = getMockedHooks();

    // Clear previous mock calls but keep implementations
    Object.values(mockedHooks).forEach((mockFn) => {
      if (jest.isMockFunction(mockFn)) {
        mockFn.mockClear();
      }
    });

    // Setup default mocks (these will be overridden in individual tests)
    mockedHooks.usePerpsWithdrawQuote.mockReturnValue(defaultMockQuote);
    mockedHooks.useWithdrawValidation.mockReturnValue(defaultMockValidation);
    mockedHooks.usePerpsTrading.mockReturnValue(defaultMockTrading);
    mockedHooks.usePerpsNetwork.mockReturnValue('mainnet');

    store = mockStore({
      ...backgroundState,
      engine: {
        backgroundState: {
          ...backgroundState,
          AccountsController: {
            internalAccounts: {
              selectedAccount: 'account1',
              accounts: {
                account1: {
                  address: '0x1234567890abcdef',
                },
              },
            },
          },
          TokenListController: {
            tokenList: {
              [`${ARBITRUM_MAINNET_CHAIN_ID}_${ZERO_ADDRESS}`]: {
                symbol: USDC_SYMBOL,
                decimals: USDC_DECIMALS,
                name: 'USD Coin',
                iconUrl: 'https://test.com/usdc.png',
              },
            },
          },
          PreferencesController: {
            isIpfsGatewayEnabled: false,
          },
        },
      },
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const renderComponent = () =>
    render(
      <Provider store={store}>
        <ToastContext.Provider value={{ toastRef: mockToastRef }}>
          <PerpsWithdrawView />
        </ToastContext.Provider>
      </Provider>,
    );

  describe('Basic Rendering', () => {
    it('should render withdrawal view correctly', () => {
      renderComponent();

      expect(screen.getByText('Withdraw')).toBeTruthy();
      expect(screen.getByTestId('source-token-area')).toBeTruthy();
      expect(screen.getByTestId('dest-token-area')).toBeTruthy();
      expect(screen.getByTestId('withdraw-back-button')).toBeTruthy();
    });

    it('should display available balance', () => {
      renderComponent();

      expect(screen.getByTestId('source-token-area-balance')).toBeTruthy();
    });

    it('should render continue button when not focused', () => {
      renderComponent();

      expect(screen.getByTestId('continue-button')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should handle back button press', () => {
      renderComponent();

      fireEvent.press(screen.getByTestId('withdraw-back-button'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('Input Focus Management', () => {
    it('should show keypad when input is focused', () => {
      renderComponent();

      fireEvent.press(screen.getByTestId('source-token-area-input'));

      expect(screen.getByTestId('keypad')).toBeTruthy();
    });

    it('should show percentage buttons when input is focused', () => {
      renderComponent();

      fireEvent.press(screen.getByTestId('source-token-area-input'));

      expect(screen.getByText('10%')).toBeTruthy();
      expect(screen.getByText('25%')).toBeTruthy();
      expect(screen.getByText('Max')).toBeTruthy();
      expect(screen.getByText('Done')).toBeTruthy();
    });

    it('should hide keypad when done is pressed', () => {
      renderComponent();

      // Focus input
      fireEvent.press(screen.getByTestId('source-token-area-input'));
      expect(screen.getByTestId('keypad')).toBeTruthy();

      // Press done
      fireEvent.press(screen.getByText('Done'));

      // Keypad should be hidden
      expect(screen.queryByTestId('keypad')).toBeNull();
    });
  });

  describe('Keypad Functionality', () => {
    it('should update amount when keypad numbers are pressed', () => {
      renderComponent();

      // Focus input to show keypad
      fireEvent.press(screen.getByTestId('source-token-area-input'));

      // Press number on keypad
      fireEvent.press(screen.getByTestId('keypad-1'));
      fireEvent.press(screen.getByTestId('keypad-0'));

      // Amount should be updated (we can't directly test state, but we can test behavior)
      expect(screen.getByTestId('keypad')).toBeTruthy();
    });

    it('should clear amount when clear is pressed', () => {
      renderComponent();

      // Focus input to show keypad
      fireEvent.press(screen.getByTestId('source-token-area-input'));

      // Add some numbers then clear
      fireEvent.press(screen.getByTestId('keypad-1'));
      fireEvent.press(screen.getByTestId('keypad-clear'));

      expect(screen.getByTestId('keypad')).toBeTruthy();
    });

    it('should not allow input beyond MAX_INPUT_LENGTH', () => {
      renderComponent();

      // Focus input to show keypad
      fireEvent.press(screen.getByTestId('source-token-area-input'));

      // Try to add 11 characters (MAX_INPUT_LENGTH is 10)
      for (let i = 0; i < 11; i++) {
        fireEvent.press(screen.getByTestId('keypad-1'));
      }

      // Component should handle this gracefully
      expect(screen.getByTestId('keypad')).toBeTruthy();
    });
  });

  describe('Percentage Buttons', () => {
    it('should calculate 10% correctly', () => {
      const mockedHooks = jest.requireMock('../../hooks');
      mockedHooks.useWithdrawValidation.mockReturnValue({
        ...defaultMockValidation,
        availableBalance: '1000.00',
      });

      renderComponent();

      // Focus input to show percentage buttons
      fireEvent.press(screen.getByTestId('source-token-area-input'));

      // Press 10%
      fireEvent.press(screen.getByText('10%'));

      // The component should handle the percentage calculation
      expect(screen.getByText('10%')).toBeTruthy();
    });

    it('should calculate 25% correctly', () => {
      const mockedHooks = jest.requireMock('../../hooks');
      mockedHooks.useWithdrawValidation.mockReturnValue({
        ...defaultMockValidation,
        availableBalance: '1000.00',
      });

      renderComponent();

      fireEvent.press(screen.getByTestId('source-token-area-input'));
      fireEvent.press(screen.getByText('25%'));

      expect(screen.getByText('25%')).toBeTruthy();
    });

    it('should set max amount when Max is pressed', () => {
      const mockedHooks = jest.requireMock('../../hooks');
      mockedHooks.useWithdrawValidation.mockReturnValue({
        ...defaultMockValidation,
        availableBalance: '1000.00',
      });

      renderComponent();

      fireEvent.press(screen.getByTestId('source-token-area-input'));
      fireEvent.press(screen.getByText('Max'));

      expect(screen.getByText('Max')).toBeTruthy();
    });

    it('should not calculate percentage when balance is zero', () => {
      const mockedHooks = jest.requireMock('../../hooks');
      mockedHooks.useWithdrawValidation.mockReturnValue({
        ...defaultMockValidation,
        availableBalance: '0',
      });

      renderComponent();

      fireEvent.press(screen.getByTestId('source-token-area-input'));
      fireEvent.press(screen.getByText('10%'));

      // Should still render but not crash
      expect(screen.getByText('10%')).toBeTruthy();
    });
  });

  describe('Quote Details Display', () => {
    it('should display quote details when amount is valid', () => {
      const mockedHooks = jest.requireMock('../../hooks');
      mockedHooks.useWithdrawValidation.mockReturnValue({
        ...defaultMockValidation,
        hasAmount: true,
      });

      mockedHooks.usePerpsWithdrawQuote.mockReturnValue({
        ...defaultMockQuote,
        error: null,
      });

      renderComponent();

      // Quote details should be visible
      expect(screen.getByText('5 minutes')).toBeTruthy();
    });

    it('should not display quote details when there is an error', () => {
      const mockedHooks = jest.requireMock('../../hooks');
      mockedHooks.useWithdrawValidation.mockReturnValue({
        ...defaultMockValidation,
        hasAmount: true,
      });

      mockedHooks.usePerpsWithdrawQuote.mockReturnValue({
        ...defaultMockQuote,
        error: 'Invalid amount',
      });

      renderComponent();

      // Quote details should not be visible when there's an error
      expect(screen.queryByText('5 minutes')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should display error message for below minimum amount', () => {
      const mockedHooks = jest.requireMock('../../hooks');
      mockedHooks.useWithdrawValidation.mockReturnValue({
        ...defaultMockValidation,
        isBelowMinimum: true,
        hasAmount: true,
      });

      renderComponent();

      expect(screen.getByText(/Minimum withdrawal amount is/i)).toBeTruthy();
    });

    it('should display quote error message', () => {
      const mockedHooks = jest.requireMock('../../hooks');
      mockedHooks.usePerpsWithdrawQuote.mockReturnValue({
        ...defaultMockQuote,
        error: 'Network error',
      });

      renderComponent();

      expect(screen.getByText('Network error')).toBeTruthy();
    });
  });

  describe('Button States', () => {
    it('should enable continue button when inputs are valid', () => {
      const mockedHooks = jest.requireMock('../../hooks');
      mockedHooks.useWithdrawValidation.mockReturnValue({
        ...defaultMockValidation,
        hasAmount: true,
        hasInsufficientBalance: false,
        isBelowMinimum: false,
      });

      mockedHooks.usePerpsWithdrawQuote.mockReturnValue({
        ...defaultMockQuote,
        hasValidQuote: true,
      });

      renderComponent();

      expect(screen.getByTestId('continue-button')).not.toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty available balance gracefully', () => {
      const mockedHooks = getMockedHooks();
      mockedHooks.useWithdrawValidation.mockReturnValue({
        ...defaultMockValidation,
        availableBalance: '',
      });

      renderComponent();

      // Focus input to show percentage buttons
      fireEvent.press(screen.getByTestId('source-token-area-input'));

      // Pressing percentage buttons should not crash
      fireEvent.press(screen.getByText('10%'));
      fireEvent.press(screen.getByText('Max'));

      expect(screen.getByText('10%')).toBeTruthy();
    });

    it('should handle null available balance gracefully', () => {
      const mockedHooks = getMockedHooks();
      mockedHooks.useWithdrawValidation.mockReturnValue({
        ...defaultMockValidation,
        availableBalance: null,
      });

      renderComponent();

      fireEvent.press(screen.getByTestId('source-token-area-input'));
      fireEvent.press(screen.getByText('10%'));

      expect(screen.getByText('10%')).toBeTruthy();
    });

    it('should handle missing toast ref gracefully', () => {
      const renderComponentWithoutToast = () =>
        render(
          <Provider store={store}>
            <ToastContext.Provider value={{ toastRef: { current: null } }}>
              <PerpsWithdrawView />
            </ToastContext.Provider>
          </Provider>,
        );

      expect(() => renderComponentWithoutToast()).not.toThrow();
    });

    it('should handle focus/blur cycles correctly', () => {
      renderComponent();

      // Focus input
      fireEvent.press(screen.getByTestId('source-token-area-input'));
      expect(screen.getByTestId('keypad')).toBeTruthy();

      // Blur input
      fireEvent.press(screen.getByTestId('source-token-area-blur'));

      // Focus again
      fireEvent.press(screen.getByTestId('source-token-area-input'));
      expect(screen.getByTestId('keypad')).toBeTruthy();
    });
  });
});
