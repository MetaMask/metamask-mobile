import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PredictPicks from './PredictPicks';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { PredictPositionStatus, type PredictPosition } from '../../types';
import { formatPrice } from '../../utils/format';

jest.mock('../../hooks/usePredictPositions');
jest.mock('../../utils/format');

const mockUsePredictPositions = usePredictPositions as jest.MockedFunction<
  typeof usePredictPositions
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

describe('PredictPicks', () => {
  const mockLoadPositions = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictPositions.mockReturnValue({
      positions: [],
      isLoading: false,
      isRefreshing: false,
      error: null,
      loadPositions: mockLoadPositions,
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
    jest.resetAllMocks();
  });

  describe('rendering states', () => {
    it('returns null when there are no positions and not loading', () => {
      mockUsePredictPositions.mockReturnValue({
        positions: [],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });

      render(<PredictPicks marketId="market-1" />);

      expect(screen.queryByTestId('predict-picks')).toBeNull();
    });

    it('returns null when loading with no existing positions', () => {
      mockUsePredictPositions.mockReturnValue({
        positions: [],
        isLoading: true,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });

      render(<PredictPicks marketId="market-1" />);

      expect(screen.queryByTestId('predict-picks')).toBeNull();
    });

    it('returns null when refreshing with no existing positions', () => {
      mockUsePredictPositions.mockReturnValue({
        positions: [],
        isLoading: false,
        isRefreshing: true,
        error: null,
        loadPositions: mockLoadPositions,
      });

      render(<PredictPicks marketId="market-1" />);

      expect(screen.queryByTestId('predict-picks')).toBeNull();
    });

    it('renders container when positions exist', () => {
      mockUsePredictPositions.mockReturnValue({
        positions: [createMockPosition()],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });

      render(<PredictPicks marketId="market-1" />);

      expect(screen.getAllByTestId('predict-picks').length).toBeGreaterThan(0);
    });

    it('renders "Your Picks" header when positions exist', () => {
      mockUsePredictPositions.mockReturnValue({
        positions: [createMockPosition()],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });

      render(<PredictPicks marketId="market-1" />);

      expect(screen.getByText('Your Picks')).toBeOnTheScreen();
    });
  });

  describe('position display', () => {
    it('displays position size and outcome', () => {
      mockUsePredictPositions.mockReturnValue({
        positions: [createMockPosition({ size: 50, outcome: 'Yes' })],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });

      render(<PredictPicks marketId="market-1" />);

      expect(screen.getByText(/\$50\.00 on/)).toBeOnTheScreen();
      expect(screen.getByText(/Yes/)).toBeOnTheScreen();
    });

    it('displays positive cashPnl value', () => {
      mockUsePredictPositions.mockReturnValue({
        positions: [createMockPosition({ cashPnl: 25.75 })],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });

      render(<PredictPicks marketId="market-1" />);

      expect(screen.getByText('$25.75')).toBeOnTheScreen();
    });

    it('displays negative cashPnl value', () => {
      mockUsePredictPositions.mockReturnValue({
        positions: [createMockPosition({ cashPnl: -10.5 })],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });

      render(<PredictPicks marketId="market-1" />);

      expect(screen.getByText('$-10.50')).toBeOnTheScreen();
    });

    it('displays zero cashPnl value', () => {
      mockUsePredictPositions.mockReturnValue({
        positions: [createMockPosition({ cashPnl: 0 })],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });

      render(<PredictPicks marketId="market-1" />);

      expect(screen.getByText('$0.00')).toBeOnTheScreen();
    });

    it('renders Cash Out button for each position', () => {
      mockUsePredictPositions.mockReturnValue({
        positions: [createMockPosition()],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });

      render(<PredictPicks marketId="market-1" />);

      expect(screen.getByText('Cash Out')).toBeOnTheScreen();
    });
  });

  describe('multiple positions', () => {
    it('renders all positions in the list', () => {
      const positions = [
        createMockPosition({ id: 'pos-1', outcome: 'Yes', size: 100 }),
        createMockPosition({ id: 'pos-2', outcome: 'No', size: 200 }),
        createMockPosition({ id: 'pos-3', outcome: 'Maybe', size: 50 }),
      ];
      mockUsePredictPositions.mockReturnValue({
        positions,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });

      render(<PredictPicks marketId="market-1" />);

      expect(screen.getByText(/Yes/)).toBeOnTheScreen();
      expect(screen.getByText(/No/)).toBeOnTheScreen();
      expect(screen.getByText(/Maybe/)).toBeOnTheScreen();
    });

    it('renders Cash Out button for each position', () => {
      const positions = [
        createMockPosition({ id: 'pos-1' }),
        createMockPosition({ id: 'pos-2' }),
      ];
      mockUsePredictPositions.mockReturnValue({
        positions,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });

      render(<PredictPicks marketId="market-1" />);

      const cashOutButtons = screen.getAllByText('Cash Out');

      expect(cashOutButtons).toHaveLength(2);
    });
  });

  describe('hook configuration', () => {
    it('calls usePredictPositions with correct marketId', () => {
      mockUsePredictPositions.mockReturnValue({
        positions: [],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });

      render(<PredictPicks marketId="specific-market-123" />);

      expect(mockUsePredictPositions).toHaveBeenCalledWith({
        marketId: 'specific-market-123',
        autoRefreshTimeout: 10000,
      });
    });

    it('passes autoRefreshTimeout of 10000ms to hook', () => {
      mockUsePredictPositions.mockReturnValue({
        positions: [],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });

      render(<PredictPicks marketId="market-1" />);

      expect(mockUsePredictPositions).toHaveBeenCalledWith(
        expect.objectContaining({
          autoRefreshTimeout: 10000,
        }),
      );
    });
  });

  describe('formatPrice calls', () => {
    it('calls formatPrice for position size', () => {
      mockUsePredictPositions.mockReturnValue({
        positions: [createMockPosition({ size: 15.75 })],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });

      render(<PredictPicks marketId="market-1" />);

      expect(mockFormatPrice).toHaveBeenCalledWith(15.75, {
        maximumDecimals: 2,
      });
    });

    it('calls formatPrice for cashPnl', () => {
      mockUsePredictPositions.mockReturnValue({
        positions: [createMockPosition({ cashPnl: 1234.56 })],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });

      render(<PredictPicks marketId="market-1" />);

      expect(mockFormatPrice).toHaveBeenCalledWith(1234.56, {
        maximumDecimals: 2,
      });
    });
  });
});
