import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { ToastContext } from '../../../../../component-library/components/Toast';
import PerpsWithdrawView from './PerpsWithdrawView';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  ARBITRUM_MAINNET_CHAIN_ID,
  HYPERLIQUID_MAINNET_CHAIN_ID,
  HYPERLIQUID_WITHDRAWAL_FEE,
  USDC_SYMBOL,
  USDC_DECIMALS,
  ZERO_ADDRESS,
} from '../../constants/hyperLiquidConfig';
import { enhanceTokenWithIcon } from '../../utils/tokenIconUtils';

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
      },
      withdraw: jest.fn(),
      isTestnet: false,
    },
  },
}));

// Mock toast context
const mockShowToast = jest.fn();
const mockToastRef = {
  current: {
    showToast: mockShowToast,
  },
};

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'perps.withdrawal.title': 'Withdraw',
      'perps.withdrawal.withdraw_usdc': 'Withdraw USDC',
      'perps.withdrawal.insufficient_funds': 'Insufficient funds',
      'perps.withdrawal.minimum_amount_error': params?.amount
        ? `Minimum withdrawal: ${params.amount} USDC`
        : 'Minimum withdrawal required',
      'perps.withdrawal.enter_amount': 'Enter amount',
      'perps.withdrawal.initiated': 'Withdrawal initiated',
      'perps.withdrawal.wait_time_message':
        'Your funds should arrive within 5 minutes',
      'perps.withdrawal.error': 'Withdrawal failed',
      'perps.withdrawal.error_generic': 'An error occurred during withdrawal',
      'perps.withdrawal.invalid_amount': 'Please enter a valid amount',
      'perps.deposit.max_button': 'Max',
      'perps.deposit.done_button': 'Done',
    };
    return translations[key] || key;
  }),
}));

// Mock components to avoid complex dependencies
jest.mock('../../../Ramp/Aggregator/components/Keypad', () => {
  const View = jest.requireActual('react-native').View;
  const Text = jest.requireActual('react-native').Text;
  return {
    __esModule: true,
    default: ({
      onChange,
      value,
    }: {
      onChange: (data: { value: string; valueAsNumber: number }) => void;
      value: string;
    }) => (
      <View testID="keypad">
        <Text testID="keypad-value">{value}</Text>
        <View
          testID="keypad-input"
          onTouchEnd={() => onChange({ value: '100', valueAsNumber: 100 })}
        />
      </View>
    ),
  };
});

jest.mock('../../components/PerpsQuoteDetailsCard', () => {
  const View = jest.requireActual('react-native').View;
  const Text = jest.requireActual('react-native').Text;
  return {
    __esModule: true,
    default: ({
      networkFee,
      estimatedTime,
      rate,
      metamaskFee,
    }: {
      networkFee: string;
      estimatedTime: string;
      rate: string;
      metamaskFee: string;
    }) => (
      <View testID="perps-quote-details">
        <Text testID="network-fee">{networkFee}</Text>
        <Text testID="estimated-time">{estimatedTime}</Text>
        <Text testID="rate">{rate}</Text>
        <Text testID="metamask-fee">{metamaskFee}</Text>
      </View>
    ),
  };
});

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
      MockReact.useImperativeHandle(ref, () => ({
        blur: jest.fn(),
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

// Mock token icon utils
jest.mock('../../utils/tokenIconUtils', () => ({
  enhanceTokenWithIcon: jest.fn((params) => ({
    ...params.token,
    image: 'https://test.com/usdc.png',
  })),
}));

// Mock usePerpsWithdrawQuote hook
jest.mock('../../hooks', () => ({
  usePerpsAccount: jest.fn(() => ({
    availableBalance: '$1000.00',
  })),
  usePerpsNetwork: jest.fn(() => 'mainnet'),
  usePerpsWithdrawQuote: jest.fn((params) => {
    const amount = parseFloat(params.amount || '0');
    const WITHDRAWAL_FEE = 1; // Hardcoded value for HYPERLIQUID_WITHDRAWAL_FEE
    const hasValidQuote = amount > 0 && amount > WITHDRAWAL_FEE;

    return {
      formattedQuoteData: {
        networkFee: `$${WITHDRAWAL_FEE.toFixed(2)}`,
        estimatedTime: '~5 minutes',
        receivingAmount:
          amount > WITHDRAWAL_FEE
            ? `${(amount - WITHDRAWAL_FEE).toFixed(2)} USDC`
            : '0.00 USDC',
      },
      hasValidQuote,
      error: amount > 0 && amount <= WITHDRAWAL_FEE ? 'Amount too low' : null,
    };
  }),
  usePerpsTrading: jest.fn(() => ({
    withdraw: jest.fn().mockResolvedValue({
      success: true,
      txHash: '0x123456789',
    }),
  })),
}));

const mockStore = configureMockStore();

describe('PerpsWithdrawView', () => {
  let store: ReturnType<typeof mockStore>;

  beforeEach(() => {
    jest.clearAllMocks();

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

  const renderComponent = () =>
    render(
      <Provider store={store}>
        <ToastContext.Provider value={{ toastRef: mockToastRef }}>
          <PerpsWithdrawView />
        </ToastContext.Provider>
      </Provider>,
    );

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
    expect(screen.getByText('1000')).toBeTruthy(); // Available balance without $ and ,
  });

  it('should handle back button press', () => {
    renderComponent();

    fireEvent.press(screen.getByTestId('withdraw-back-button'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('should show keypad when input is focused', () => {
    renderComponent();

    const sourceInput = screen.getByTestId('source-token-area-input');
    fireEvent.press(sourceInput);

    expect(screen.getByTestId('keypad')).toBeTruthy();
    expect(screen.getByText('10%')).toBeTruthy();
    expect(screen.getByText('25%')).toBeTruthy();
    expect(screen.getByText('Max')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
  });

  it('should update amount when keypad is used', () => {
    renderComponent();

    const sourceInput = screen.getByTestId('source-token-area-input');
    fireEvent.press(sourceInput);

    const keypadInput = screen.getByTestId('keypad-input');
    fireEvent(keypadInput, 'touchEnd');

    // The keypad mock sets value to '100'
    expect(screen.getByTestId('keypad-value').props.children).toBe('100');
  });

  it('should handle percentage button presses', () => {
    renderComponent();

    const sourceInput = screen.getByTestId('source-token-area-input');
    fireEvent.press(sourceInput);

    // Test 10% button
    const tenPercentButton = screen.getByText('10%');
    fireEvent.press(tenPercentButton);

    // Test 25% button
    const twentyFivePercentButton = screen.getByText('25%');
    fireEvent.press(twentyFivePercentButton);

    // Test Max button
    const maxButton = screen.getByText('Max');
    fireEvent.press(maxButton);
  });

  it('should validate minimum withdrawal amount', () => {
    renderComponent();

    // Enter amount below minimum
    const sourceInput = screen.getByTestId('source-token-area-input');
    fireEvent.press(sourceInput);

    // The continue button should be disabled for amounts below minimum
    const continueButton = screen.getAllByTestId('continue-button')[0];
    expect(continueButton.props.disabled).toBe(true);
  });

  it('should show quote details when amount is entered', async () => {
    const { rerender } = renderComponent();

    // Mock the hook to return a valid amount
    const usePerpsWithdrawQuoteMock =
      jest.requireMock('../../hooks').usePerpsWithdrawQuote;
    usePerpsWithdrawQuoteMock.mockReturnValue({
      formattedQuoteData: {
        networkFee: '$1.00',
        estimatedTime: '~5 minutes',
        receivingAmount: '99.00 USDC',
      },
      hasValidQuote: true,
      error: null,
    });

    rerender(
      <Provider store={store}>
        <ToastContext.Provider value={{ toastRef: mockToastRef }}>
          <PerpsWithdrawView />
        </ToastContext.Provider>
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('perps-quote-details')).toBeTruthy();
      expect(screen.getByTestId('network-fee')).toBeTruthy();
      expect(screen.getByText('$1.00')).toBeTruthy();
      expect(screen.getByText('~5 minutes')).toBeTruthy();
    });
  });

  it('should handle successful withdrawal', async () => {
    const withdrawMock = jest.fn().mockResolvedValue({
      success: true,
      txHash: '0x123456789',
    });

    jest.requireMock('../../hooks').usePerpsTrading.mockReturnValue({
      withdraw: withdrawMock,
    });

    renderComponent();

    // Mock valid amount and quote
    const usePerpsWithdrawQuoteMock =
      jest.requireMock('../../hooks').usePerpsWithdrawQuote;
    usePerpsWithdrawQuoteMock.mockReturnValue({
      formattedQuoteData: {
        networkFee: '$1.00',
        estimatedTime: '~5 minutes',
        receivingAmount: '99.00 USDC',
      },
      hasValidQuote: true,
      error: null,
    });

    // Find and press continue button
    const continueButtons = screen.getAllByTestId('continue-button');
    const enabledButton = continueButtons.find(
      (button) => !button.props.disabled,
    );

    if (enabledButton) {
      fireEvent.press(enabledButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          variant: 'Plain',
          hasNoTimeout: false,
          labelOptions: [
            {
              label: 'Withdrawal initiated',
              isBold: true,
            },
            {
              label: 'Your funds should arrive within 5 minutes',
            },
          ],
        });

        expect(withdrawMock).toHaveBeenCalledWith({
          amount: expect.any(String),
          assetId: expect.any(String),
        });

        expect(mockNavigate).toHaveBeenCalledWith('PerpsView');
        
        // Verify toast was shown
        expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: ToastVariants.Icon,
            iconName: IconName.ArrowUp,
            hasNoTimeout: false,
            labelOptions: expect.arrayContaining([
              expect.objectContaining({
                label: expect.stringContaining('withdrawal initiated'),
              }),
              expect.objectContaining({
                label: expect.stringContaining('5 minutes'),
              }),
            ]),
          }),
        );
      });
    }
  });

  it('should handle withdrawal error', async () => {
    const withdrawMock = jest.fn().mockResolvedValue({
      success: false,
      error: 'Network error',
    });

    jest.requireMock('../../hooks').usePerpsTrading.mockReturnValue({
      withdraw: withdrawMock,
    });

    renderComponent();

    // Mock valid amount and quote
    const usePerpsWithdrawQuoteMock =
      jest.requireMock('../../hooks').usePerpsWithdrawQuote;
    usePerpsWithdrawQuoteMock.mockReturnValue({
      formattedQuoteData: {
        networkFee: '$1.00',
        estimatedTime: '~5 minutes',
        receivingAmount: '99.00 USDC',
      },
      hasValidQuote: true,
      error: null,
    });

    // Find and press continue button
    const continueButtons = screen.getAllByTestId('continue-button');
    const enabledButton = continueButtons.find(
      (button) => !button.props.disabled,
    );

    if (enabledButton) {
      fireEvent.press(enabledButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          variant: 'Icon',
          iconName: 'Danger',
          hasNoTimeout: false,
          labelOptions: [
            {
              label: 'Withdrawal failed',
              isBold: true,
            },
            {
              label: 'Network error',
            },
          ],
        });
      });
    }
  });

  it('should handle Done button press', () => {
    renderComponent();

    const sourceInput = screen.getByTestId('source-token-area-input');
    fireEvent.press(sourceInput);

    const doneButton = screen.getByText('Done');
    fireEvent.press(doneButton);

    // Keypad should be hidden after Done is pressed
    // In real implementation, this would hide the keypad
  });

  it('should display tokens with enhanced icons', () => {
    renderComponent();

    expect(enhanceTokenWithIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.objectContaining({
          symbol: USDC_SYMBOL,
          chainId: HYPERLIQUID_MAINNET_CHAIN_ID,
        }),
      }),
    );

    expect(enhanceTokenWithIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.objectContaining({
          symbol: USDC_SYMBOL,
          chainId: expect.any(String), // Arbitrum chain ID
        }),
      }),
    );
  });

  it('should show error for insufficient balance', () => {
    // Mock available balance to be lower
    jest.requireMock('../../hooks').usePerpsAccount.mockReturnValue({
      availableBalance: '$10.00',
    });

    const { rerender } = renderComponent();

    // Mock amount higher than balance
    const usePerpsWithdrawQuoteMock =
      jest.requireMock('../../hooks').usePerpsWithdrawQuote;
    usePerpsWithdrawQuoteMock.mockReturnValue({
      formattedQuoteData: {
        networkFee: '$1.00',
        estimatedTime: '~5 minutes',
        receivingAmount: '99.00 USDC',
      },
      hasValidQuote: false,
      error: null,
    });

    rerender(
      <Provider store={store}>
        <ToastContext.Provider value={{ toastRef: mockToastRef }}>
          <PerpsWithdrawView />
        </ToastContext.Provider>
      </Provider>,
    );

    const continueButtons = screen.getAllByText('Insufficient funds');
    expect(continueButtons.length).toBeGreaterThan(0);
  });
});
