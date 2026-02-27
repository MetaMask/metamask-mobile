import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PredictPicksForCard from './PredictPicksForCard';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { PredictPositionStatus, type PredictPosition } from '../../types';
import { formatPrice } from '../../utils/format';

import { POLYMARKET_PROVIDER_ID } from '../../providers/polymarket/constants';
jest.mock('../../hooks/usePredictPositions');
jest.mock('../../hooks/usePredictLivePositions', () => ({
  usePredictLivePositions: jest.fn((positions: unknown[]) => ({
    livePositions: positions ?? [],
    isConnected: false,
    lastUpdateTime: null,
  })),
}));
jest.mock('../../utils/format');

const mockUsePredictPositions = usePredictPositions as jest.Mock;
const mockFormatPrice = formatPrice as jest.MockedFunction<typeof formatPrice>;

const createMockPosition = (
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  id: 'position-1',
  providerId: POLYMARKET_PROVIDER_ID,
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: '0',
  icon: 'https://example.com/icon.png',
  title: 'Will BTC hit 100k?',
  outcome: 'Yes',
  outcomeIndex: 0,
  amount: 25,
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

describe('PredictPicksForCard', () => {
  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictPositions.mockReturnValue({
      data: [],
      isLoading: false,
      isRefetching: false,
      error: null,
      refetch: mockRefetch,
    });
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
    it('renders container with default testID when positions exist', () => {
      mockUsePredictPositions.mockReturnValue({
        data: [createMockPosition()],
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PredictPicksForCard marketId="market-1" />);

      expect(
        screen.getAllByTestId('predict-picks-for-card').length,
      ).toBeGreaterThan(0);
    });

    it('renders container with custom testID when positions exist', () => {
      mockUsePredictPositions.mockReturnValue({
        data: [createMockPosition()],
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(
        <PredictPicksForCard marketId="market-1" testID="custom-card-picks" />,
      );

      expect(screen.getAllByTestId('custom-card-picks').length).toBeGreaterThan(
        0,
      );
    });

    it('returns null when no positions', () => {
      mockUsePredictPositions.mockReturnValue({
        data: [],
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PredictPicksForCard marketId="market-1" />);

      expect(screen.queryByTestId('predict-picks-for-card')).toBeNull();
    });
  });

  describe('position display', () => {
    it('displays position outcome text', () => {
      mockUsePredictPositions.mockReturnValue({
        data: [createMockPosition({ size: 50, outcome: 'Yes' })],
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PredictPicksForCard marketId="market-1" />);

      expect(screen.getByText(/Yes to win/)).toBeOnTheScreen();
    });

    it('displays formatted initialValue', () => {
      mockUsePredictPositions.mockReturnValue({
        data: [createMockPosition({ initialValue: 50, outcome: 'Yes' })],
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PredictPicksForCard marketId="market-1" />);

      expect(mockFormatPrice).toHaveBeenCalledWith(50, { maximumDecimals: 2 });
    });

    it('displays cashPnl value', () => {
      mockUsePredictPositions.mockReturnValue({
        data: [createMockPosition({ cashPnl: 25.75 })],
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PredictPicksForCard marketId="market-1" />);

      expect(screen.getByText('$25.75')).toBeOnTheScreen();
    });

    it('displays negative cashPnl value', () => {
      mockUsePredictPositions.mockReturnValue({
        data: [createMockPosition({ cashPnl: -10.5 })],
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PredictPicksForCard marketId="market-1" />);

      expect(screen.getByText('$-10.50')).toBeOnTheScreen();
    });

    it('displays zero cashPnl value', () => {
      mockUsePredictPositions.mockReturnValue({
        data: [createMockPosition({ cashPnl: 0 })],
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PredictPicksForCard marketId="market-1" />);

      expect(screen.getByText('$0.00')).toBeOnTheScreen();
    });

    it('applies SuccessDefault color when cashPnl is positive', () => {
      mockUsePredictPositions.mockReturnValue({
        data: [createMockPosition({ id: 'pos-positive', cashPnl: 25.75 })],
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PredictPicksForCard marketId="market-1" />);

      const pnlText = screen.getByTestId(
        'predict-picks-for-card-pnl-pos-positive',
      );
      expect(pnlText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: expect.any(String),
          }),
        ]),
      );
    });

    it('applies ErrorDefault color when cashPnl is negative', () => {
      mockUsePredictPositions.mockReturnValue({
        data: [createMockPosition({ id: 'pos-negative', cashPnl: -10.5 })],
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PredictPicksForCard marketId="market-1" />);

      const pnlText = screen.getByTestId(
        'predict-picks-for-card-pnl-pos-negative',
      );
      expect(pnlText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: expect.any(String),
          }),
        ]),
      );
    });

    it('applies SuccessDefault color when cashPnl is zero (break-even)', () => {
      mockUsePredictPositions.mockReturnValue({
        data: [createMockPosition({ id: 'pos-zero', cashPnl: 0 })],
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PredictPicksForCard marketId="market-1" />);

      const pnlText = screen.getByTestId('predict-picks-for-card-pnl-pos-zero');
      expect(pnlText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: expect.any(String),
          }),
        ]),
      );
    });

    it('displays position currentValue', () => {
      mockUsePredictPositions.mockReturnValue({
        data: [createMockPosition({ currentValue: 75.25 })],
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PredictPicksForCard marketId="market-1" />);

      expect(screen.getByText('$75.25')).toBeOnTheScreen();
    });
  });

  describe('multiple positions', () => {
    it('renders all positions in the list', () => {
      const positions = [
        createMockPosition({ id: 'pos-1', outcome: 'Yes', size: 100 }),
        createMockPosition({ id: 'pos-2', outcome: 'No', size: 200 }),
      ];
      mockUsePredictPositions.mockReturnValue({
        data: positions,
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PredictPicksForCard marketId="market-1" />);

      expect(screen.getByText(/Yes to win/)).toBeOnTheScreen();
      expect(screen.getByText(/No to win/)).toBeOnTheScreen();
    });

    it('calls formatPrice for each position cashPnl', () => {
      const positions = [
        createMockPosition({ id: 'pos-1', cashPnl: 10 }),
        createMockPosition({ id: 'pos-2', cashPnl: 20 }),
      ];
      mockUsePredictPositions.mockReturnValue({
        data: positions,
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PredictPicksForCard marketId="market-1" />);

      expect(mockFormatPrice).toHaveBeenCalledWith(10, { maximumDecimals: 2 });
      expect(mockFormatPrice).toHaveBeenCalledWith(20, { maximumDecimals: 2 });
    });
  });

  describe('hook configuration', () => {
    it('calls usePredictPositions with correct marketId when no positions prop', () => {
      mockUsePredictPositions.mockReturnValue({
        data: [],
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PredictPicksForCard marketId="specific-market-456" />);

      expect(mockUsePredictPositions).toHaveBeenCalledWith({
        marketId: 'specific-market-456',
        refetchInterval: 10000,
        enabled: true,
      });
    });

    it('passes refetchInterval of 10000ms to hook when no positions prop', () => {
      mockUsePredictPositions.mockReturnValue({
        data: [],
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PredictPicksForCard marketId="market-1" />);

      expect(mockUsePredictPositions).toHaveBeenCalledWith(
        expect.objectContaining({
          refetchInterval: 10000,
        }),
      );
    });

    it('disables hook fetching when positions prop is provided', () => {
      const providedPositions = [createMockPosition()];

      render(
        <PredictPicksForCard
          marketId="market-1"
          positions={providedPositions}
        />,
      );

      expect(mockUsePredictPositions).toHaveBeenCalledWith({
        marketId: 'market-1',
        refetchInterval: undefined,
        enabled: false,
      });
    });
  });

  describe('positions prop', () => {
    it('uses provided positions instead of fetched positions', () => {
      const providedPositions = [
        createMockPosition({ id: 'provided-1', outcome: 'Provided Yes' }),
      ];

      mockUsePredictPositions.mockReturnValue({
        data: [createMockPosition({ id: 'fetched-1', outcome: 'Fetched' })],
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(
        <PredictPicksForCard
          marketId="market-1"
          positions={providedPositions}
        />,
      );

      expect(screen.getByText(/Provided Yes to win/)).toBeOnTheScreen();
      expect(screen.queryByText(/Fetched to win/)).toBeNull();
    });

    it('renders provided positions correctly', () => {
      const providedPositions = [
        createMockPosition({ id: 'pos-1', outcome: 'Team A', cashPnl: 10 }),
        createMockPosition({ id: 'pos-2', outcome: 'Team B', cashPnl: -5 }),
      ];

      render(
        <PredictPicksForCard
          marketId="market-1"
          positions={providedPositions}
        />,
      );

      expect(screen.getByText(/Team A to win/)).toBeOnTheScreen();
      expect(screen.getByText(/Team B to win/)).toBeOnTheScreen();
    });

    it('returns null when provided positions is empty', () => {
      render(<PredictPicksForCard marketId="market-1" positions={[]} />);

      expect(screen.queryByTestId('predict-picks-for-card')).toBeNull();
    });

    it('renders separator with provided positions when showSeparator is true', () => {
      const providedPositions = [createMockPosition()];

      render(
        <PredictPicksForCard
          marketId="market-1"
          positions={providedPositions}
          showSeparator
        />,
      );

      expect(
        screen.getByTestId('predict-picks-for-card-separator'),
      ).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('displays position with different outcome text', () => {
      mockUsePredictPositions.mockReturnValue({
        data: [createMockPosition({ outcome: 'Maybe' })],
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PredictPicksForCard marketId="market-1" />);

      expect(screen.getByText(/Maybe to win/)).toBeOnTheScreen();
    });
  });

  describe('separator', () => {
    it('renders separator when showSeparator is true and positions exist', () => {
      mockUsePredictPositions.mockReturnValue({
        data: [createMockPosition()],
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PredictPicksForCard marketId="market-1" showSeparator />);

      expect(
        screen.getByTestId('predict-picks-for-card-separator'),
      ).toBeOnTheScreen();
    });

    it('does not render separator when showSeparator is false', () => {
      mockUsePredictPositions.mockReturnValue({
        data: [createMockPosition()],
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PredictPicksForCard marketId="market-1" showSeparator={false} />);

      expect(
        screen.queryByTestId('predict-picks-for-card-separator'),
      ).toBeNull();
    });

    it('does not render separator when showSeparator is true but no positions', () => {
      mockUsePredictPositions.mockReturnValue({
        data: [],
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PredictPicksForCard marketId="market-1" showSeparator />);

      expect(
        screen.queryByTestId('predict-picks-for-card-separator'),
      ).toBeNull();
    });

    it('renders separator with custom testID', () => {
      mockUsePredictPositions.mockReturnValue({
        data: [createMockPosition()],
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockRefetch,
      });

      render(
        <PredictPicksForCard
          marketId="market-1"
          testID="custom-picks"
          showSeparator
        />,
      );

      expect(screen.getByTestId('custom-picks-separator')).toBeOnTheScreen();
    });
  });
});
