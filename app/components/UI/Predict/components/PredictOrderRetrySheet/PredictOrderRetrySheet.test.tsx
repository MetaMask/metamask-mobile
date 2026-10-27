import React from 'react';
import { Modal } from 'react-native';
import { render, fireEvent, within } from '@testing-library/react-native';
import PredictOrderRetrySheet from './PredictOrderRetrySheet';
import { Side, type OrderPreview } from '../../types';
import { PredictOrderRetrySheetSelectorsIDs } from '../../Predict.testIds';

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
      (
        props: { children?: React.ReactNode; isInteractable?: boolean },
        _ref: React.Ref<unknown>,
      ) =>
        ReactActual.createElement(
          View,
          { testID: 'bottom-sheet', isInteractable: props.isInteractable },
          props.children,
        ),
    );
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter',
  () => {
    const ReactActual = jest.requireActual('react');
    const {
      View,
      TouchableOpacity,
      Text: RNText,
    } = jest.requireActual('react-native');
    return ({
      buttonPropsArray,
    }: {
      buttonPropsArray: {
        label: string;
        onPress: () => void;
        testID?: string;
        isDisabled?: boolean;
      }[];
    }) =>
      ReactActual.createElement(
        View,
        null,
        buttonPropsArray.map((btn, index) =>
          ReactActual.createElement(
            TouchableOpacity,
            {
              key: btn.testID ?? `footer-button-${index}`,
              testID: btn.testID ?? `footer-button-${index}`,
              onPress: btn.onPress,
              disabled: btn.isDisabled,
            },
            ReactActual.createElement(RNText, null, btn.label),
          ),
        ),
      );
  },
);

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) => {
    const map: Record<string, string> = {
      'predict.order.market_busy_title': 'Market busy',
      'predict.order.getting_price_body':
        "The market is moving fast, so we couldn't fill your order. Getting the latest price…",
      'predict.order.price_updated_body':
        "Here's the latest price. Confirm to try again:",
      'predict.order.retry_price_label': 'Price',
      'predict.order.retry_proceeds_label': 'You receive',
      'predict.order.retry_expected_fill_label': 'Expected fill',
      'predict.order.retry_expected_fill_value': `${params?.shares ?? ''} shares`,
      'predict.order.market_timeout_title': 'Market timed out',
      'predict.order.market_timeout_body':
        'The market took too long to respond. Nothing was sold.',
      'predict.order.retry_payout_label': 'To win',
      'predict.order.retry_worst_case_label': `Worst case (${params?.band ?? ''} band)`,
      'predict.order.retry_fees_label': 'Fees',
      'predict.order.yes_buy_at': `Yes, buy at ${params?.price ?? ''}`,
      'predict.order.yes_sell_at': `Yes, sell at ${params?.price ?? ''}`,
      'predict.order.price_unavailable_title': 'Price unavailable',
      'predict.order.price_unavailable_body':
        "We couldn't get the latest price. Check your connection and try again.",
      'predict.order.price_moved_title': 'Price moved',
      'predict.order.price_moved_body': `Moved from ${params?.previousPrice ?? ''} to ${params?.currentPrice ?? ''}`,
      'predict.order.no_match_title': 'No match',
      'predict.order.no_match_body':
        "There isn't enough liquidity to fill your order right now.",
      'predict.order.try_later': 'Try later',
      'predict.order.order_failed_title': 'Order failed',
      'predict.order.order_failed_body':
        "Your order couldn't be filled. Try again?",
      'predict.order.try_again': 'Try again',
    };
    return map[key] ?? key;
  },
}));

jest.mock('../../utils/format', () => ({
  formatCents: (value: number) => `${Math.round(value * 100)}¢`,
  formatPrice: (value: number) => `$${value.toFixed(2)}`,
  formatPositionSize: (value: number) => value.toFixed(2),
}));

function createMockPreview(overrides?: Partial<OrderPreview>): OrderPreview {
  return {
    marketId: 'market-123',
    outcomeId: 'outcome-123',
    outcomeTokenId: 'token-456',
    timestamp: Date.now(),
    side: Side.BUY,
    sharePrice: 0.65,
    maxAmountSpent: 10,
    minAmountReceived: 15.38,
    slippage: 0.03,
    tickSize: 0.01,
    minOrderSize: 1,
    negRisk: false,
    fees: {
      metamaskFee: 0.09,
      providerFee: 0.03,
      marketFee: 0.06,
      totalFee: 0.18,
      totalFeePercentage: 2,
      collector: '0x0000000000000000000000000000000000000000',
    },
    ...overrides,
  };
}

describe('PredictOrderRetrySheet', () => {
  const defaultProps = {
    variant: 'busy' as const,
    side: Side.BUY,
    preview: null as OrderPreview | null,
    onRetry: jest.fn(),
    onConfirm: jest.fn(),
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

    it('renders the sheet in a full-window modal so a parent sheet cannot clip it', () => {
      const { UNSAFE_getByType } = render(
        <PredictOrderRetrySheet {...defaultProps} />,
      );

      const modal = UNSAFE_getByType(Modal);
      expect(modal.props.transparent).toBe(true);
      expect(within(modal).getByTestId('bottom-sheet')).toBeOnTheScreen();
    });

    it('closes the sheet on Android back', () => {
      const { UNSAFE_getByType } = render(
        <PredictOrderRetrySheet {...defaultProps} />,
      );

      UNSAFE_getByType(Modal).props.onRequestClose();

      expect(mockCloseSheet).toHaveBeenCalledTimes(1);
    });
  });

  describe('busy variant', () => {
    it('renders Market busy title', () => {
      const { getByText } = render(
        <PredictOrderRetrySheet {...defaultProps} variant="busy" />,
      );

      expect(getByText('Market busy')).toBeOnTheScreen();
    });

    it('renders the fetching-price body', () => {
      const { getByText } = render(
        <PredictOrderRetrySheet {...defaultProps} variant="busy" />,
      );

      expect(getByText(/Getting the latest price/)).toBeOnTheScreen();
    });

    it('renders no action button while the fresh quote is being fetched', () => {
      const { queryByTestId } = render(
        <PredictOrderRetrySheet {...defaultProps} variant="busy" />,
      );

      expect(
        queryByTestId(PredictOrderRetrySheetSelectorsIDs.RETRY_BUTTON),
      ).toBeNull();
    });
  });

  describe('confirm variant — SELL', () => {
    const sellPreview = createMockPreview({
      side: Side.SELL,
      sharePrice: 0.65,
      maxAmountSpent: 9.5,
      minAmountReceived: 6.18,
      slippage: 0.05,
    });

    it('renders the refreshed cents price', () => {
      const { getByText } = render(
        <PredictOrderRetrySheet
          {...defaultProps}
          variant="confirm"
          side={Side.SELL}
          preview={sellPreview}
        />,
      );

      expect(getByText('65¢')).toBeOnTheScreen();
    });

    it('renders net proceeds, worst case within the 5% band, and fees', () => {
      const { getByText } = render(
        <PredictOrderRetrySheet
          {...defaultProps}
          variant="confirm"
          side={Side.SELL}
          preview={sellPreview}
        />,
      );

      expect(getByText('You receive')).toBeOnTheScreen();
      expect(getByText('$6.00')).toBeOnTheScreen();
      expect(getByText('Expected fill')).toBeOnTheScreen();
      expect(getByText('9.50 shares')).toBeOnTheScreen();
      expect(getByText('Worst case (5% band)')).toBeOnTheScreen();
      expect(getByText('$5.69')).toBeOnTheScreen();
      expect(getByText('Fees')).toBeOnTheScreen();
      expect(getByText('$0.18')).toBeOnTheScreen();
    });

    it('confirms the refreshed quote with a price-bound CTA', () => {
      const onConfirm = jest.fn();
      const { getByText } = render(
        <PredictOrderRetrySheet
          {...defaultProps}
          variant="confirm"
          side={Side.SELL}
          preview={sellPreview}
          onConfirm={onConfirm}
        />,
      );

      fireEvent.press(getByText('Yes, sell at 65¢'));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('formats the band without float noise', () => {
      // 0.07 * 100 is 7.000000000000001 in float math — the label must
      // not show the noise.
      const { getByText } = render(
        <PredictOrderRetrySheet
          {...defaultProps}
          variant="confirm"
          side={Side.SELL}
          preview={createMockPreview({
            side: Side.SELL,
            sharePrice: 0.65,
            maxAmountSpent: 9.5,
            minAmountReceived: 6.18,
            slippage: 0.07,
          })}
        />,
      );

      expect(getByText('Worst case (7% band)')).toBeOnTheScreen();
    });
  });

  describe('confirm variant — BUY', () => {
    const buyPreview = createMockPreview();

    it('renders payout, worst case within the 3% band, and fees', () => {
      const { getByText } = render(
        <PredictOrderRetrySheet
          {...defaultProps}
          variant="confirm"
          side={Side.BUY}
          preview={buyPreview}
        />,
      );

      expect(getByText('To win')).toBeOnTheScreen();
      expect(getByText('$15.38')).toBeOnTheScreen();
      expect(getByText('Worst case (3% band)')).toBeOnTheScreen();
      expect(getByText('$14.92')).toBeOnTheScreen();
      expect(getByText('Fees')).toBeOnTheScreen();
      expect(getByText('$0.18')).toBeOnTheScreen();
    });

    it('confirms the refreshed quote with a price-bound CTA', () => {
      const onConfirm = jest.fn();
      const { getByText } = render(
        <PredictOrderRetrySheet
          {...defaultProps}
          variant="confirm"
          side={Side.BUY}
          preview={buyPreview}
          onConfirm={onConfirm}
        />,
      );

      fireEvent.press(getByText('Yes, buy at 65¢'));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('failed variant', () => {
    it('renders Order failed title and Try again button', () => {
      const { getByText } = render(
        <PredictOrderRetrySheet {...defaultProps} variant="failed" />,
      );

      expect(getByText('Order failed')).toBeOnTheScreen();
      expect(getByText('Try again')).toBeOnTheScreen();
    });

    it('calls onRetry when Try again is pressed', () => {
      const onRetry = jest.fn();
      const { getByTestId } = render(
        <PredictOrderRetrySheet
          {...defaultProps}
          variant="failed"
          onRetry={onRetry}
        />,
      );

      fireEvent.press(
        getByTestId(PredictOrderRetrySheetSelectorsIDs.RETRY_BUTTON),
      );

      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('quote_unavailable variant', () => {
    it('renders the recoverable error state without submitting', () => {
      const onConfirm = jest.fn();
      const { getByText } = render(
        <PredictOrderRetrySheet
          {...defaultProps}
          variant="quote_unavailable"
          onConfirm={onConfirm}
        />,
      );

      expect(getByText('Price unavailable')).toBeOnTheScreen();
      expect(
        getByText(/Check your connection and try again/),
      ).toBeOnTheScreen();
      expect(getByText('Try again')).toBeOnTheScreen();
    });

    it('calls onRetry when Try again is pressed', () => {
      const onRetry = jest.fn();
      const { getByTestId } = render(
        <PredictOrderRetrySheet
          {...defaultProps}
          variant="quote_unavailable"
          onRetry={onRetry}
        />,
      );

      fireEvent.press(
        getByTestId(PredictOrderRetrySheetSelectorsIDs.RETRY_BUTTON),
      );

      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('timeout variant', () => {
    it('renders the timeout copy without quote rows', () => {
      const { getByText, queryByText } = render(
        <PredictOrderRetrySheet {...defaultProps} variant="timeout" />,
      );

      expect(getByText('Market timed out')).toBeOnTheScreen();
      expect(getByText(/took too long to respond/)).toBeOnTheScreen();
      expect(queryByText('Price')).not.toBeOnTheScreen();
    });

    it('calls onRetry when Try again is pressed', () => {
      const onRetry = jest.fn();
      const { getByTestId } = render(
        <PredictOrderRetrySheet
          {...defaultProps}
          variant="timeout"
          onRetry={onRetry}
        />,
      );

      fireEvent.press(
        getByTestId(PredictOrderRetrySheetSelectorsIDs.RETRY_BUTTON),
      );

      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('price_moved variant', () => {
    const movedPreview = createMockPreview({
      side: Side.SELL,
      sharePrice: 0.62,
      slippage: 0.05,
    });

    it('renders the move explicitly with both prices and the quote rows', () => {
      const { getByText } = render(
        <PredictOrderRetrySheet
          {...defaultProps}
          variant="price_moved"
          side={Side.SELL}
          preview={movedPreview}
          previousPrice={0.65}
        />,
      );

      expect(getByText('Price moved')).toBeOnTheScreen();
      expect(getByText('Moved from 65¢ to 62¢')).toBeOnTheScreen();
      expect(getByText('Price')).toBeOnTheScreen();
      expect(getByText('Yes, sell at 62¢')).toBeOnTheScreen();
    });

    it('submits the displayed quote on confirm', () => {
      const onConfirm = jest.fn();
      const { getByTestId } = render(
        <PredictOrderRetrySheet
          {...defaultProps}
          variant="price_moved"
          side={Side.SELL}
          preview={movedPreview}
          previousPrice={0.65}
          onConfirm={onConfirm}
        />,
      );

      fireEvent.press(
        getByTestId(PredictOrderRetrySheetSelectorsIDs.RETRY_BUTTON),
      );

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('no_match variant', () => {
    it('renders the no-match copy without quote rows or a submit CTA', () => {
      const { getByText, queryByText } = render(
        <PredictOrderRetrySheet {...defaultProps} variant="no_match" />,
      );

      expect(getByText('No match')).toBeOnTheScreen();
      expect(
        getByText("There isn't enough liquidity to fill your order right now."),
      ).toBeOnTheScreen();
      expect(queryByText('Price')).toBeNull();
      expect(queryByText(/Yes, (buy|sell) at/)).toBeNull();
    });

    it('offers Try again that re-fetches', () => {
      const onRetry = jest.fn();
      const { getByTestId } = render(
        <PredictOrderRetrySheet
          {...defaultProps}
          variant="no_match"
          onRetry={onRetry}
        />,
      );

      fireEvent.press(
        getByTestId(PredictOrderRetrySheetSelectorsIDs.RETRY_BUTTON),
      );

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('offers Try later that dismisses without submitting', () => {
      const onRetry = jest.fn();
      const onConfirm = jest.fn();
      const { getByTestId } = render(
        <PredictOrderRetrySheet
          {...defaultProps}
          variant="no_match"
          onRetry={onRetry}
          onConfirm={onConfirm}
        />,
      );

      fireEvent.press(
        getByTestId(PredictOrderRetrySheetSelectorsIDs.TRY_LATER_BUTTON),
      );

      expect(mockCloseSheet).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
      expect(onRetry).not.toHaveBeenCalled();
    });
  });

  describe('interactions', () => {
    it('disables the action button when isRetrying is true', () => {
      const { getByTestId } = render(
        <PredictOrderRetrySheet
          {...defaultProps}
          variant="confirm"
          preview={createMockPreview()}
          isRetrying
        />,
      );

      expect(
        getByTestId(PredictOrderRetrySheetSelectorsIDs.RETRY_BUTTON),
      ).toBeDisabled();
    });

    it('calls closeSheet when close button pressed', () => {
      const { getByTestId } = render(
        <PredictOrderRetrySheet {...defaultProps} />,
      );

      fireEvent.press(
        getByTestId(PredictOrderRetrySheetSelectorsIDs.CLOSE_BUTTON),
      );

      expect(mockCloseSheet).toHaveBeenCalledTimes(1);
    });

    it.each([
      [
        'the close button',
        (view: ReturnType<typeof render>) =>
          fireEvent.press(
            view.getByTestId(PredictOrderRetrySheetSelectorsIDs.CLOSE_BUTTON),
          ),
      ],
      [
        'Try later',
        (view: ReturnType<typeof render>) =>
          fireEvent.press(
            view.getByTestId(
              PredictOrderRetrySheetSelectorsIDs.TRY_LATER_BUTTON,
            ),
          ),
      ],
      [
        'Android back',
        (view: ReturnType<typeof render>) =>
          view.UNSAFE_getByType(Modal).props.onRequestClose(),
      ],
    ])('cancels before the close animation on %s', (_, close) => {
      const onCancel = jest.fn();
      const view = render(
        <PredictOrderRetrySheet
          {...defaultProps}
          variant="no_match"
          onCancel={onCancel}
        />,
      );

      close(view);

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onCancel.mock.invocationCallOrder[0]).toBeLessThan(
        mockCloseSheet.mock.invocationCallOrder[0],
      );
    });

    it.each([
      [false, true],
      [true, false],
    ])(
      'when isRetrying is %s, swipe and backdrop close are enabled: %s',
      (isRetrying, isInteractable) => {
        const { getByTestId } = render(
          <PredictOrderRetrySheet {...defaultProps} isRetrying={isRetrying} />,
        );

        expect(getByTestId('bottom-sheet').props.isInteractable).toBe(
          isInteractable,
        );
      },
    );
  });
});
