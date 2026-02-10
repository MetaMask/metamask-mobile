import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PredictOrderRetrySheet from './PredictOrderRetrySheet';
import { Side } from '../../types';

const mockCloseSheet = jest.fn();
const mockHandleSheetClosed = jest.fn();
const mockGetRefHandlers = jest.fn(() => ({
  onOpenBottomSheet: jest.fn(),
  onCloseBottomSheet: jest.fn(),
}));
let mockIsVisible = true;

jest.mock('../../hooks/usePredictBottomSheet', () => ({
  usePredictBottomSheet: (params?: { onDismiss?: () => void }) => ({
    sheetRef: { current: null },
    isVisible: mockIsVisible,
    closeSheet: (...args: unknown[]) => {
      mockCloseSheet(...args);
    },
    handleSheetClosed: (...args: unknown[]) => {
      mockHandleSheetClosed(...args);
      params?.onDismiss?.();
    },
    getRefHandlers: mockGetRefHandlers,
  }),
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactActual.forwardRef(
      (props: { children?: React.ReactNode }, _ref: React.Ref<unknown>) =>
        ReactActual.createElement(
          View,
          { testID: 'bottom-sheet' },
          props.children,
        ),
    );
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader/BottomSheetHeader',
  () => {
    const ReactActual = jest.requireActual('react');
    const { TouchableOpacity, Text: RNText } =
      jest.requireActual('react-native');
    return ({ onClose }: { onClose?: () => void }) =>
      ReactActual.createElement(
        TouchableOpacity,
        { testID: 'sheet-header-close', onPress: onClose },
        ReactActual.createElement(RNText, null, 'X'),
      );
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter',
  () => {
    const ReactActual = jest.requireActual('react');
    const { TouchableOpacity, Text: RNText } =
      jest.requireActual('react-native');
    return ({
      buttonPropsArray,
    }: {
      buttonPropsArray: {
        label: string;
        onPress: () => void;
        isDisabled?: boolean;
      }[];
    }) => {
      const btn = buttonPropsArray[0];
      return ReactActual.createElement(
        TouchableOpacity,
        {
          testID: 'retry-button',
          onPress: btn.onPress,
          disabled: btn.isDisabled,
        },
        ReactActual.createElement(RNText, null, btn.label),
      );
    };
  },
);

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) => {
    const map: Record<string, string> = {
      'predict.order.market_busy_title': 'Market busy',
      'predict.order.market_busy_body_buy': `The market is moving fast, so we couldn't buy at ${params?.price ?? ''}. Try again at the best available price?`,
      'predict.order.market_busy_body_sell': `The market is moving fast, so we couldn't sell at ${params?.price ?? ''}. Try again at the best available price?`,
      'predict.order.order_failed_title': 'Order failed',
      'predict.order.order_failed_body':
        "There wasn't enough liquidity at this price. Want to try again?",
      'predict.order.yes_buy': 'Yes, buy',
      'predict.order.yes_sell': 'Yes, sell',
      'predict.order.try_again': 'Try again',
    };
    return map[key] ?? key;
  },
}));

jest.mock('../../utils/format', () => ({
  formatCents: (value: number) => `${Math.round(value * 100)}¢`,
}));

describe('PredictOrderRetrySheet', () => {
  const defaultProps = {
    variant: 'busy' as const,
    sharePrice: 0.51,
    side: Side.BUY,
    onRetry: jest.fn(),
    onDismiss: jest.fn(),
    isRetrying: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsVisible = true;
  });

  describe('visibility', () => {
    it('renders null when not visible', () => {
      mockIsVisible = false;

      const { queryByTestId } = render(
        <PredictOrderRetrySheet {...defaultProps} />,
      );

      expect(queryByTestId('bottom-sheet')).toBeNull();
    });

    it('renders content when visible', () => {
      const { getByTestId } = render(
        <PredictOrderRetrySheet {...defaultProps} />,
      );

      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
    });
  });

  describe('busy variant', () => {
    it('renders Market busy title', () => {
      const { getByText } = render(
        <PredictOrderRetrySheet {...defaultProps} variant="busy" />,
      );

      expect(getByText('Market busy')).toBeOnTheScreen();
    });

    it('renders buy body text with price for BUY side', () => {
      const { getByText } = render(
        <PredictOrderRetrySheet
          {...defaultProps}
          variant="busy"
          side={Side.BUY}
          sharePrice={0.51}
        />,
      );

      expect(getByText(/couldn't buy at 51¢/)).toBeOnTheScreen();
    });

    it('renders sell body text for SELL side', () => {
      const { getByText } = render(
        <PredictOrderRetrySheet
          {...defaultProps}
          variant="busy"
          side={Side.SELL}
        />,
      );

      expect(getByText(/couldn't sell at/)).toBeOnTheScreen();
    });

    it('renders Yes, buy button for BUY side', () => {
      const { getByText } = render(
        <PredictOrderRetrySheet
          {...defaultProps}
          variant="busy"
          side={Side.BUY}
        />,
      );

      expect(getByText('Yes, buy')).toBeOnTheScreen();
    });

    it('renders Yes, sell button for SELL side', () => {
      const { getByText } = render(
        <PredictOrderRetrySheet
          {...defaultProps}
          variant="busy"
          side={Side.SELL}
        />,
      );

      expect(getByText('Yes, sell')).toBeOnTheScreen();
    });
  });

  describe('failed variant', () => {
    it('renders Order failed title', () => {
      const { getByText } = render(
        <PredictOrderRetrySheet {...defaultProps} variant="failed" />,
      );

      expect(getByText('Order failed')).toBeOnTheScreen();
    });

    it('renders liquidity body text', () => {
      const { getByText } = render(
        <PredictOrderRetrySheet {...defaultProps} variant="failed" />,
      );

      expect(getByText(/enough liquidity/)).toBeOnTheScreen();
    });

    it('renders Try again button', () => {
      const { getByText } = render(
        <PredictOrderRetrySheet {...defaultProps} variant="failed" />,
      );

      expect(getByText('Try again')).toBeOnTheScreen();
    });
  });

  describe('interactions', () => {
    it('calls onRetry when retry button pressed', () => {
      const onRetry = jest.fn();

      const { getByTestId } = render(
        <PredictOrderRetrySheet {...defaultProps} onRetry={onRetry} />,
      );

      fireEvent.press(getByTestId('retry-button'));

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('calls closeSheet when header close pressed', () => {
      const { getByTestId } = render(
        <PredictOrderRetrySheet {...defaultProps} />,
      );

      fireEvent.press(getByTestId('sheet-header-close'));

      expect(mockCloseSheet).toHaveBeenCalledTimes(1);
    });
  });
});
