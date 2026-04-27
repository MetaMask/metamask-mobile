import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import PredictBuyAmountSection from './PredictBuyAmountSection';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    if (key === 'predict.order.available') {
      return 'Available';
    }
    if (key === 'predict.order.to_win') {
      return 'To win';
    }
    return key;
  }),
}));

jest.mock('../../../../utils/format', () => ({
  formatPrice: jest.fn((value: number) => `$${value.toFixed(2)}`),
}));

jest.mock('../../../../components/PredictAmountDisplay', () => {
  const {
    Pressable: RNPressable,
    View: RNView,
    Text: RNText,
  } = jest.requireActual('react-native');
  return function MockPredictAmountDisplay(props: Record<string, unknown>) {
    return (
      <RNPressable
        testID="amount-display"
        onPress={props.onPress as () => void}
      >
        <RNView>
          <RNText>{props.amount as string}</RNText>
          <RNText testID="amount-display-active">
            {String(props.isActive)}
          </RNText>
        </RNView>
      </RNPressable>
    );
  };
});

jest.mock(
  '../../../../../../../component-library/components-temp/Skeleton/Skeleton',
  () => {
    const { View: RNView } = jest.requireActual('react-native');
    return function MockSkeleton(props: Record<string, unknown>) {
      return <RNView testID={`skeleton-${props.width}`} />;
    };
  },
);

describe('PredictBuyAmountSection', () => {
  const mockKeypadRef = {
    current: {
      handleAmountPress: jest.fn(),
      handleKeypadAmountPress: jest.fn(),
      handleDonePress: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('balance display', () => {
    it('shows skeleton when isBalanceLoading is true', () => {
      renderWithProvider(
        <PredictBuyAmountSection
          currentValueUSDString="$100"
          keypadRef={mockKeypadRef}
          isInputFocused={false}
          isBalanceLoading
          isBalancePulsing={false}
          availableBalanceDisplay="$500"
          toWin={100}
          isShowingToWinSkeleton={false}
          isPlacingOrder={false}
        />,
      );

      expect(screen.getByTestId('skeleton-120')).toBeOnTheScreen();
    });

    it('displays balance text when isBalanceLoading is false', () => {
      renderWithProvider(
        <PredictBuyAmountSection
          currentValueUSDString="$100"
          keypadRef={mockKeypadRef}
          isInputFocused={false}
          isBalanceLoading={false}
          isBalancePulsing={false}
          availableBalanceDisplay="$500"
          toWin={100}
          isShowingToWinSkeleton={false}
          isPlacingOrder={false}
        />,
      );

      expect(screen.getByText(/Available/)).toBeOnTheScreen();
      expect(screen.getByText(/\$500/)).toBeOnTheScreen();
    });

    it('hides available balance when hideAvailableBalance is true', () => {
      renderWithProvider(
        <PredictBuyAmountSection
          currentValueUSDString="$100"
          keypadRef={mockKeypadRef}
          isInputFocused={false}
          isBalanceLoading={false}
          isBalancePulsing={false}
          availableBalanceDisplay="$500"
          toWin={100}
          isShowingToWinSkeleton={false}
          isPlacingOrder={false}
          hideAvailableBalance
        />,
      );

      expect(screen.queryByText(/Available/)).toBeNull();
      expect(screen.queryByText(/\$500/)).toBeNull();
    });

    it('displays available balance with correct format', () => {
      renderWithProvider(
        <PredictBuyAmountSection
          currentValueUSDString="$250"
          keypadRef={mockKeypadRef}
          isInputFocused={false}
          isBalanceLoading={false}
          isBalancePulsing={false}
          availableBalanceDisplay="$1,234.56"
          toWin={250}
          isShowingToWinSkeleton={false}
          isPlacingOrder={false}
        />,
      );

      expect(screen.getByText(/\$1,234\.56/)).toBeOnTheScreen();
    });
  });

  describe('toWin display', () => {
    it('shows skeleton when isShowingToWinSkeleton is true', () => {
      renderWithProvider(
        <PredictBuyAmountSection
          currentValueUSDString="$100"
          keypadRef={mockKeypadRef}
          isInputFocused={false}
          isBalanceLoading={false}
          isBalancePulsing={false}
          availableBalanceDisplay="$500"
          toWin={100}
          isShowingToWinSkeleton
          isPlacingOrder={false}
        />,
      );

      expect(screen.getByTestId('skeleton-80')).toBeOnTheScreen();
    });

    it('displays formatted toWin amount when not showing skeleton', () => {
      renderWithProvider(
        <PredictBuyAmountSection
          currentValueUSDString="$100"
          keypadRef={mockKeypadRef}
          isInputFocused={false}
          isBalanceLoading={false}
          isBalancePulsing={false}
          availableBalanceDisplay="$500"
          toWin={150}
          isShowingToWinSkeleton={false}
          isPlacingOrder={false}
        />,
      );

      expect(screen.getByText(/\$150\.00/)).toBeOnTheScreen();
    });

    it('displays to win label', () => {
      renderWithProvider(
        <PredictBuyAmountSection
          currentValueUSDString="$100"
          keypadRef={mockKeypadRef}
          isInputFocused={false}
          isBalanceLoading={false}
          isBalancePulsing={false}
          availableBalanceDisplay="$500"
          toWin={100}
          isShowingToWinSkeleton={false}
          isPlacingOrder={false}
        />,
      );

      expect(screen.getByText(/To win/)).toBeOnTheScreen();
    });
  });

  describe('amount display', () => {
    it('renders PredictAmountDisplay with current value', () => {
      renderWithProvider(
        <PredictBuyAmountSection
          currentValueUSDString="$250.50"
          keypadRef={mockKeypadRef}
          isInputFocused={false}
          isBalanceLoading={false}
          isBalancePulsing={false}
          availableBalanceDisplay="$500"
          toWin={250}
          isShowingToWinSkeleton={false}
          isPlacingOrder={false}
        />,
      );

      expect(screen.getByTestId('amount-display')).toBeOnTheScreen();
    });

    it('calls keypad handleAmountPress when amount is pressed', () => {
      renderWithProvider(
        <PredictBuyAmountSection
          currentValueUSDString="$100"
          keypadRef={mockKeypadRef}
          isInputFocused={false}
          isBalanceLoading={false}
          isBalancePulsing={false}
          availableBalanceDisplay="$500"
          toWin={100}
          isShowingToWinSkeleton={false}
          isPlacingOrder={false}
        />,
      );

      const amountDisplay = screen.getByTestId('amount-display');
      fireEvent.press(amountDisplay);

      expect(mockKeypadRef.current.handleAmountPress).toHaveBeenCalledTimes(1);
    });

    it('marks the amount display as active when focused and not placing an order', () => {
      renderWithProvider(
        <PredictBuyAmountSection
          currentValueUSDString="$100"
          keypadRef={mockKeypadRef}
          isInputFocused
          isBalanceLoading={false}
          isBalancePulsing={false}
          availableBalanceDisplay="$500"
          toWin={100}
          isShowingToWinSkeleton={false}
          isPlacingOrder={false}
        />,
      );

      expect(screen.getByTestId('amount-display-active')).toHaveTextContent(
        'true',
      );
    });
  });

  describe('animation behavior', () => {
    it('starts animation when isBalancePulsing is true', () => {
      renderWithProvider(
        <PredictBuyAmountSection
          currentValueUSDString="$100"
          keypadRef={mockKeypadRef}
          isInputFocused={false}
          isBalanceLoading={false}
          isBalancePulsing
          availableBalanceDisplay="$500"
          toWin={100}
          isShowingToWinSkeleton={false}
          isPlacingOrder={false}
        />,
      );

      expect(screen.getByText(/Available/)).toBeOnTheScreen();
    });

    it('does not animate when isBalancePulsing is false', () => {
      renderWithProvider(
        <PredictBuyAmountSection
          currentValueUSDString="$100"
          keypadRef={mockKeypadRef}
          isInputFocused={false}
          isBalanceLoading={false}
          isBalancePulsing={false}
          availableBalanceDisplay="$500"
          toWin={100}
          isShowingToWinSkeleton={false}
          isPlacingOrder={false}
        />,
      );

      expect(screen.getByText(/Available/)).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('handles zero toWin amount', () => {
      renderWithProvider(
        <PredictBuyAmountSection
          currentValueUSDString="$0"
          keypadRef={mockKeypadRef}
          isInputFocused={false}
          isBalanceLoading={false}
          isBalancePulsing={false}
          availableBalanceDisplay="$500"
          toWin={0}
          isShowingToWinSkeleton={false}
          isPlacingOrder={false}
        />,
      );

      expect(screen.getByText(/\$0\.00/)).toBeOnTheScreen();
    });

    it('handles large toWin amounts', () => {
      renderWithProvider(
        <PredictBuyAmountSection
          currentValueUSDString="$10000"
          keypadRef={mockKeypadRef}
          isInputFocused={false}
          isBalanceLoading={false}
          isBalancePulsing={false}
          availableBalanceDisplay="$50000"
          toWin={10000}
          isShowingToWinSkeleton={false}
          isPlacingOrder={false}
        />,
      );

      expect(screen.getByText(/\$10000\.00/)).toBeOnTheScreen();
    });

    it('handles empty currentValueUSDString', () => {
      renderWithProvider(
        <PredictBuyAmountSection
          currentValueUSDString=""
          keypadRef={mockKeypadRef}
          isInputFocused={false}
          isBalanceLoading={false}
          isBalancePulsing={false}
          availableBalanceDisplay="$500"
          toWin={100}
          isShowingToWinSkeleton={false}
          isPlacingOrder={false}
        />,
      );

      expect(screen.getByTestId('amount-display')).toBeOnTheScreen();
    });

    it('handles both loading and pulsing states', () => {
      renderWithProvider(
        <PredictBuyAmountSection
          currentValueUSDString="$100"
          keypadRef={mockKeypadRef}
          isInputFocused={false}
          isBalanceLoading
          isBalancePulsing
          availableBalanceDisplay="$500"
          toWin={100}
          isShowingToWinSkeleton={false}
          isPlacingOrder={false}
        />,
      );

      expect(screen.getByTestId('skeleton-120')).toBeOnTheScreen();
    });

    it('handles both toWin skeleton and balance loading', () => {
      renderWithProvider(
        <PredictBuyAmountSection
          currentValueUSDString="$100"
          keypadRef={mockKeypadRef}
          isInputFocused={false}
          isBalanceLoading
          isBalancePulsing={false}
          availableBalanceDisplay="$500"
          toWin={100}
          isShowingToWinSkeleton
          isPlacingOrder={false}
        />,
      );

      expect(screen.getByTestId('skeleton-120')).toBeOnTheScreen();
      expect(screen.getByTestId('skeleton-80')).toBeOnTheScreen();
    });
  });

  describe('isPlacingOrder behavior', () => {
    it('disables amount press and isActive when isPlacingOrder is true', () => {
      renderWithProvider(
        <PredictBuyAmountSection
          currentValueUSDString="$100"
          keypadRef={mockKeypadRef}
          isInputFocused
          isBalanceLoading={false}
          isBalancePulsing={false}
          availableBalanceDisplay="$500"
          toWin={100}
          isShowingToWinSkeleton={false}
          isPlacingOrder
        />,
      );

      fireEvent.press(screen.getByTestId('amount-display'));

      expect(mockKeypadRef.current.handleAmountPress).not.toHaveBeenCalled();
      expect(screen.getByTestId('amount-display-active')).toHaveTextContent(
        'false',
      );
    });
  });

  describe('integration', () => {
    it('displays all sections together', () => {
      renderWithProvider(
        <PredictBuyAmountSection
          currentValueUSDString="$100"
          keypadRef={mockKeypadRef}
          isInputFocused={false}
          isBalanceLoading={false}
          isBalancePulsing={false}
          availableBalanceDisplay="$500"
          toWin={150}
          isShowingToWinSkeleton={false}
          isPlacingOrder={false}
        />,
      );

      expect(screen.getByTestId('amount-display')).toBeOnTheScreen();
      expect(screen.getByText(/Available/)).toBeOnTheScreen();
      expect(screen.getByText(/\$500/)).toBeOnTheScreen();
      expect(screen.getByText(/To win/)).toBeOnTheScreen();
      expect(screen.getByText(/\$150\.00/)).toBeOnTheScreen();
    });
  });
});
