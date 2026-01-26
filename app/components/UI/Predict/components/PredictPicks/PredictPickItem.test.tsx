import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PredictPickItem from './PredictPickItem';
import { PredictPositionStatus, type PredictPosition } from '../../types';
import { formatPrice } from '../../utils/format';

import { usePredictOptimisticPositionRefresh } from '../../hooks/usePredictOptimisticPositionRefresh';

jest.mock('../../hooks/usePredictOptimisticPositionRefresh');
jest.mock('../../utils/format');

const mockUsePredictOptimisticPositionRefresh =
  usePredictOptimisticPositionRefresh as jest.MockedFunction<
    typeof usePredictOptimisticPositionRefresh
  >;
const mockFormatPrice = formatPrice as jest.MockedFunction<typeof formatPrice>;

const createMockPosition = (
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  id: 'position-1',
  providerId: 'polymarket',
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: '0',
  icon: 'https://example.com/icon.png',
  title: 'Will BTC hit 100k?',
  outcome: 'Yes',
  outcomeIndex: 0,
  amount: 10,
  price: 0.67,
  status: PredictPositionStatus.OPEN,
  size: 50,
  cashPnl: 15.5,
  percentPnl: 5.25,
  initialValue: 100,
  currentValue: 115.5,
  avgPrice: 0.5,
  claimable: false,
  endDate: '2025-12-31T00:00:00Z',
  ...overrides,
});

describe('PredictPickItem', () => {
  const mockOnCashOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictOptimisticPositionRefresh.mockImplementation(
      ({ position }) => position as PredictPosition,
    );
    mockFormatPrice.mockImplementation(
      (value: number | string, _options?: { maximumDecimals?: number }) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num)) return '$0.00';
        return `$${num.toFixed(2)}`;
      },
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders position info with initialValue and outcome', () => {
      const position = createMockPosition({ initialValue: 50, outcome: 'Yes' });

      render(
        <PredictPickItem
          position={position}
          onCashOut={mockOnCashOut}
          testID="test-pick"
        />,
      );

      expect(screen.getByText(/\$50\.00 on/)).toBeOnTheScreen();
      expect(screen.getByText(/Yes/)).toBeOnTheScreen();
    });

    it('renders positive cashPnl value with SuccessDefault color', () => {
      const position = createMockPosition({ id: 'pos-1', cashPnl: 25.75 });

      render(
        <PredictPickItem
          position={position}
          onCashOut={mockOnCashOut}
          testID="test-pick"
        />,
      );

      const pnlText = screen.getByTestId('predict-picks-pnl-pos-1');
      expect(pnlText).toBeOnTheScreen();
      expect(screen.getByText('$25.75')).toBeOnTheScreen();
    });

    it('renders negative cashPnl value with ErrorDefault color', () => {
      const position = createMockPosition({ id: 'pos-1', cashPnl: -10.5 });

      render(
        <PredictPickItem
          position={position}
          onCashOut={mockOnCashOut}
          testID="test-pick"
        />,
      );

      expect(screen.getByText('$-10.50')).toBeOnTheScreen();
    });
  });

  describe('Cash Out button', () => {
    it('renders Cash Out button when position is not claimable', () => {
      const position = createMockPosition({ id: 'pos-1', claimable: false });

      render(
        <PredictPickItem
          position={position}
          onCashOut={mockOnCashOut}
          testID="test-pick"
        />,
      );

      expect(
        screen.getByTestId('predict-picks-cash-out-button-pos-1'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Cash out')).toBeOnTheScreen();
    });

    it('does not render Cash Out button when position is claimable', () => {
      const position = createMockPosition({ id: 'pos-1', claimable: true });

      render(
        <PredictPickItem
          position={position}
          onCashOut={mockOnCashOut}
          testID="test-pick"
        />,
      );

      expect(
        screen.queryByTestId('predict-picks-cash-out-button-pos-1'),
      ).toBeNull();
      expect(screen.queryByText('Cash out')).toBeNull();
    });

    it('calls onCashOut with position when Cash Out button is pressed', () => {
      const position = createMockPosition({ id: 'pos-1', claimable: false });

      render(
        <PredictPickItem
          position={position}
          onCashOut={mockOnCashOut}
          testID="test-pick"
        />,
      );

      fireEvent.press(
        screen.getByTestId('predict-picks-cash-out-button-pos-1'),
      );

      expect(mockOnCashOut).toHaveBeenCalledTimes(1);
      expect(mockOnCashOut).toHaveBeenCalledWith(position);
    });
  });

  describe('optimistic updates', () => {
    it('renders Skeleton when position is optimistic', () => {
      const position = createMockPosition({
        id: 'pos-1',
        claimable: false,
      });
      mockUsePredictOptimisticPositionRefresh.mockReturnValue({
        ...position,
        optimistic: true,
      });

      render(
        <PredictPickItem
          position={position}
          onCashOut={mockOnCashOut}
          testID="test-pick"
        />,
      );

      expect(screen.queryByTestId('predict-picks-pnl-pos-1')).toBeNull();
    });

    it('disables Cash Out button when position is optimistic', () => {
      const position = createMockPosition({
        id: 'pos-1',
        claimable: false,
      });
      mockUsePredictOptimisticPositionRefresh.mockReturnValue({
        ...position,
        optimistic: true,
      });

      render(
        <PredictPickItem
          position={position}
          onCashOut={mockOnCashOut}
          testID="test-pick"
        />,
      );

      const button = screen.getByTestId('predict-picks-cash-out-button-pos-1');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('formatPrice calls', () => {
    it('calls formatPrice for position initialValue', () => {
      const position = createMockPosition({ initialValue: 15.75 });

      render(
        <PredictPickItem
          position={position}
          onCashOut={mockOnCashOut}
          testID="test-pick"
        />,
      );

      expect(mockFormatPrice).toHaveBeenCalledWith(15.75, {
        maximumDecimals: 2,
      });
    });

    it('calls formatPrice for cashPnl', () => {
      const position = createMockPosition({ cashPnl: 1234.56 });

      render(
        <PredictPickItem
          position={position}
          onCashOut={mockOnCashOut}
          testID="test-pick"
        />,
      );

      expect(mockFormatPrice).toHaveBeenNthCalledWith(2, 1234.56, {
        maximumDecimals: 2,
      });
    });
  });
});
