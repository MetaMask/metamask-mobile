import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PredictBuyWithAnyToken from './PredictBuyWithAnyToken';

const mockHandleConfirm = jest.fn();
const mockResetOrderNotFilled = jest.fn();
const mockSetCurrentValue = jest.fn();
const mockSetCurrentValueUSDString = jest.fn();
const mockSetIsInputFocused = jest.fn();
const mockSetIsUserInputChange = jest.fn();
const mockSetIsConfirming = jest.fn();
const mockHandleRetryWithBestPrice = jest.fn();

let mockPayWithAnyTokenEnabled = true;
let mockFakOrdersEnabled = false;
let mockIsPlacingOrder = false;
let mockCanPlaceBet = true;
let mockErrorMessage: string | undefined;

const mockUsePredictBuyFlowReturn = () => ({
  machineState: { state: 'preview' },
  isPlacingOrder: mockIsPlacingOrder,

  input: {
    currentValue: 20,
    setCurrentValue: mockSetCurrentValue,
    currentValueUSDString: '$20.00',
    setCurrentValueUSDString: mockSetCurrentValueUSDString,
    isInputFocused: false,
    setIsInputFocused: mockSetIsInputFocused,
    isUserInputChange: true,
    setIsUserInputChange: mockSetIsUserInputChange,
    isConfirming: false,
    setIsConfirming: mockSetIsConfirming,
  },

  preview: {
    sharePrice: 0.62,
    minAmountReceived: 24,
  },
  previewError: null,
  isPreviewCalculating: false,

  availableBalance: 10,
  availableBalanceDisplay: '$10.00',
  isBalanceLoading: false,

  toWin: 24,
  metamaskFee: 1,
  providerFee: 2,
  total: 23,
  depositFee: 3,
  depositAmount: 4,
  rewardsFeeAmount: 5,
  totalPayForPredictBalance: 20,

  canPlaceBet: mockCanPlaceBet,
  isUserChangeTriggeringCalculation: false,
  isPayFeesLoading: false,
  isBalancePulsing: false,
  isBelowMinimum: false,
  isInsufficientBalance: false,
  maxBetAmount: 50,

  errorMessage: mockErrorMessage,
  isOrderNotFilled: false,
  resetOrderNotFilled: mockResetOrderNotFilled,

  handleConfirm: mockHandleConfirm,

  retrySheetRef: { current: null },
  retrySheetVariant: 'busy' as const,
  isRetrying: false,
  handleRetryWithBestPrice: mockHandleRetryWithBestPrice,

  payWithAnyTokenEnabled: mockPayWithAnyTokenEnabled,
  fakOrdersEnabled: mockFakOrdersEnabled,
  analyticsProperties: { marketId: 'market-1', sharePrice: 0.62 },
});

jest.mock('./machine/usePredictBuyFlow', () => ({
  usePredictBuyFlow: () => mockUsePredictBuyFlowReturn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({
    params: {
      market: { id: 'market-1' },
      outcome: { id: 'outcome-1' },
      outcomeToken: { id: 'token-1', title: 'Yes', price: 0.62 },
      entryPoint: 'market_details',
    },
  }),
}));

jest.mock(
  './components/PredictBuyPreviewHeader/PredictBuyPreviewHeader',
  () => {
    const { Text } = jest.requireActual('react-native');
    return function MockPredictBuyPreviewHeader() {
      return <Text testID="predict-buy-preview-header">Header</Text>;
    };
  },
);

jest.mock('./components/PredictBuyAmountSection', () => {
  const { Text } = jest.requireActual('react-native');
  return function MockPredictBuyAmountSection({
    availableBalanceDisplay,
    isPlacingOrder,
  }: {
    availableBalanceDisplay: string;
    isPlacingOrder: boolean;
  }) {
    return (
      <Text testID="predict-buy-amount-section">
        {`Amount Section ${availableBalanceDisplay} placing-${String(
          isPlacingOrder,
        )}`}
      </Text>
    );
  };
});

jest.mock('./components/PredictBuyBottomContent', () => {
  const { View } = jest.requireActual('react-native');
  return function MockPredictBuyBottomContent({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <View testID="predict-buy-bottom-content">{children}</View>;
  };
});

jest.mock('./components/PredictBuyError', () => {
  const { Text } = jest.requireActual('react-native');
  return function MockPredictBuyError({
    errorMessage,
  }: {
    errorMessage?: string;
  }) {
    return <Text testID="predict-buy-error">{errorMessage ?? 'no-error'}</Text>;
  };
});

jest.mock('../../components/PredictFeeBreakdownSheet', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return ReactActual.forwardRef(
    (
      {
        onClose,
        fakOrdersEnabled,
      }: {
        onClose: () => void;
        fakOrdersEnabled: boolean;
      },
      _ref: unknown,
    ) => (
      <View testID="predict-fee-breakdown-sheet">
        <Text>{`fak-orders-${String(fakOrdersEnabled)}`}</Text>
        <Pressable testID="close-fee-breakdown" onPress={onClose}>
          <Text>Close Fee Breakdown</Text>
        </Pressable>
      </View>
    ),
  );
});

jest.mock('../../components/PredictKeypad', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return ReactActual.forwardRef((_props: unknown, _ref: unknown) => (
    <View testID="predict-keypad" />
  ));
});

jest.mock('../../components/PredictOrderRetrySheet', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return ReactActual.forwardRef((_props: unknown, _ref: unknown) => (
    <View testID="predict-order-retry-sheet" />
  ));
});

jest.mock('./components/PredictPayWithAnyTokenInfo', () => {
  const { Text } = jest.requireActual('react-native');
  return function MockPredictPayWithAnyTokenInfo({
    depositAmount,
  }: {
    depositAmount: number;
  }) {
    return (
      <Text testID="predict-pay-with-any-token-info">{depositAmount}</Text>
    );
  };
});

jest.mock('./components/PredictPayWithRow', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    PredictPayWithRow: ({ disabled }: { disabled?: boolean }) => (
      <Text testID="predict-pay-with-row">{`disabled-${String(disabled)}`}</Text>
    ),
  };
});

jest.mock('./components/PredictFeeSummary/PredictFeeSummary', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return function MockPredictFeeSummary({
    handleFeesInfoPress,
  }: {
    handleFeesInfoPress: () => void;
  }) {
    return (
      <Pressable testID="predict-fee-summary" onPress={handleFeesInfoPress}>
        <Text>Fee Summary</Text>
      </Pressable>
    );
  };
});

jest.mock('./components/PredictBuyActionButton', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return function MockPredictBuyActionButton({
    onPress,
    disabled,
  }: {
    onPress: () => void;
    disabled: boolean;
  }) {
    return (
      <Pressable testID="predict-buy-action-button" onPress={onPress}>
        <Text>{`button-disabled-${String(disabled)}`}</Text>
      </Pressable>
    );
  };
});

describe('PredictBuyWithAnyToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPayWithAnyTokenEnabled = true;
    mockFakOrdersEnabled = false;
    mockIsPlacingOrder = false;
    mockCanPlaceBet = true;
    mockErrorMessage = undefined;
  });

  it('renders the screen and opens the fee breakdown sheet', () => {
    renderWithProvider(<PredictBuyWithAnyToken />);

    expect(screen.getByTestId('predict-buy-preview-header')).toBeOnTheScreen();
    expect(screen.getByTestId('predict-buy-amount-section')).toHaveTextContent(
      'Amount Section $10.00 placing-false',
    );
    expect(screen.getByTestId('predict-pay-with-row')).toHaveTextContent(
      'disabled-false',
    );

    fireEvent.press(screen.getByTestId('predict-fee-summary'));

    expect(screen.getByTestId('predict-fee-breakdown-sheet')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('close-fee-breakdown'));

    expect(
      screen.queryByTestId('predict-fee-breakdown-sheet'),
    ).not.toBeOnTheScreen();
  });

  it('hides the pay with row when the feature flag is disabled', () => {
    mockPayWithAnyTokenEnabled = false;

    renderWithProvider(<PredictBuyWithAnyToken />);

    expect(screen.queryByTestId('predict-pay-with-row')).not.toBeOnTheScreen();
  });

  it('disables token selection while an order is being placed', () => {
    mockIsPlacingOrder = true;

    renderWithProvider(<PredictBuyWithAnyToken />);

    expect(screen.getByTestId('predict-buy-amount-section')).toHaveTextContent(
      'Amount Section $10.00 placing-true',
    );
    expect(screen.getByTestId('predict-pay-with-row')).toHaveTextContent(
      'disabled-true',
    );
  });
});
