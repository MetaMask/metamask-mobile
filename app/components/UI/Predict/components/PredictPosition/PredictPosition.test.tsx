import React from 'react';
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react-native';
import PredictPosition from './PredictPosition';
import {
  PredictPositionStatus,
  type PredictPosition as PredictPositionType,
} from '../../types';
import { PredictPositionSelectorsIDs } from '../../Predict.testIds';
import { usePredictPositions } from '../../hooks/usePredictPositions';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, vars?: Record<string, string | number>) => {
    if (key === 'predict.position_info' && vars) {
      return `${vars.initialValue} on ${vars.outcome} to win ${vars.shares}`;
    }
    return key;
  }),
}));

const mockLoadPositions = jest.fn();
jest.mock('../../hooks/usePredictPositions', () => ({
  usePredictPositions: jest.fn(() => ({
    positions: [],
    loadPositions: mockLoadPositions,
    isLoading: false,
    isRefreshing: false,
    error: null,
  })),
}));

const basePosition: PredictPositionType = {
  id: 'pos-1',
  providerId: 'polymarket',
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: '0',
  icon: 'https://example.com/icon.png',
  title: 'Will ETF be approved?',
  outcome: 'Yes',
  outcomeIndex: 0,
  amount: 10,
  price: 0.67,
  status: PredictPositionStatus.OPEN,
  size: 10,
  cashPnl: 100,
  percentPnl: 5.25,
  initialValue: 123.45,
  currentValue: 2345.67,
  avgPrice: 0.34,
  claimable: false,
  endDate: '2025-12-31T00:00:00Z',
};

const renderComponent = (
  overrides?: Partial<PredictPositionType>,
  onPress?: (position: PredictPositionType) => void,
) => {
  const position: PredictPositionType = {
    ...basePosition,
    ...overrides,
  } as PredictPositionType;
  return render(<PredictPosition position={position} onPress={onPress} />);
};

describe('PredictPosition', () => {
  const mockUsePredictPositions = usePredictPositions as jest.MockedFunction<
    typeof usePredictPositions
  >;

  beforeEach(() => {
    jest.useFakeTimers();
    mockLoadPositions.mockClear();
    mockUsePredictPositions.mockReturnValue({
      positions: [],
      loadPositions: mockLoadPositions,
      isLoading: false,
      isRefreshing: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('renders primary position info', () => {
    renderComponent();

    expect(screen.getByText(basePosition.title)).toBeOnTheScreen();
    expect(screen.getByText('$123.45 on Yes to win $10')).toBeOnTheScreen();
    expect(screen.getByText('$2,345.67')).toBeOnTheScreen();
    expect(screen.getByText('5.25%')).toBeOnTheScreen();
  });

  it.each([
    { value: -3.5, expected: '-3.5%' },
    { value: 0, expected: '0%' },
    { value: 7.5, expected: '7.5%' },
  ])('formats percentPnl $value as $expected', ({ value, expected }) => {
    renderComponent({ percentPnl: value });

    expect(screen.getByText(expected)).toBeOnTheScreen();
  });

  it('displays plural shares when size is greater than 1', () => {
    renderComponent({
      initialValue: 50,
      outcome: 'No',
      avgPrice: 0.7,
      size: 10,
    });

    expect(screen.getByText('$50 on No to win $10')).toBeOnTheScreen();
  });

  it('displays singular share when size is 1', () => {
    renderComponent({
      initialValue: 50,
      outcome: 'No',
      avgPrice: 0.7,
      size: 1,
    });

    expect(screen.getByText('$50 on No to win $1')).toBeOnTheScreen();
  });

  it('renders icon image with correct URI', () => {
    const iconUrl = 'https://example.com/icon.png';
    renderComponent({ icon: iconUrl });

    const image = screen.getByTestId(
      PredictPositionSelectorsIDs.CURRENT_POSITION_CARD,
    );
    expect(image).toBeOnTheScreen();
  });

  it('calls onPress handler when pressed', () => {
    const mockOnPress = jest.fn();
    renderComponent({}, mockOnPress);

    fireEvent.press(
      screen.getByTestId(PredictPositionSelectorsIDs.CURRENT_POSITION_CARD),
    );

    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(mockOnPress).toHaveBeenCalledWith(basePosition);
  });

  it('calls onPress with overridden position data', () => {
    const mockOnPress = jest.fn();
    const customPosition = {
      initialValue: 999,
      outcome: 'Maybe',
      size: 5,
    };
    renderComponent(customPosition, mockOnPress);

    fireEvent.press(
      screen.getByTestId(PredictPositionSelectorsIDs.CURRENT_POSITION_CARD),
    );

    expect(mockOnPress).toHaveBeenCalledWith({
      ...basePosition,
      ...customPosition,
    });
  });

  it('renders without onPress handler', () => {
    renderComponent();

    const card = screen.getByTestId(
      PredictPositionSelectorsIDs.CURRENT_POSITION_CARD,
    );

    expect(card).toBeOnTheScreen();
  });

  it.each([
    { value: 10.5, description: 'positive' },
    { value: -5.3, description: 'negative' },
    { value: 0, description: 'zero' },
  ])(
    'renders currentValue correctly for $description percentPnl',
    ({ value }) => {
      renderComponent({ percentPnl: value, currentValue: 5000.99 });

      expect(screen.getByText('$5,000.99')).toBeOnTheScreen();
    },
  );

  it('formats avgPrice with 1 decimal precision in cents', () => {
    renderComponent({ avgPrice: 0.456, size: 5 });

    expect(screen.getByText('$123.45 on Yes to win $5')).toBeOnTheScreen();
  });

  it('formats avgPrice as whole cents when no decimals needed', () => {
    renderComponent({ avgPrice: 0.5, size: 2 });

    expect(screen.getByText('$123.45 on Yes to win $2')).toBeOnTheScreen();
  });

  it('formats initialValue without decimals when minimumDecimals is 0', () => {
    renderComponent({ initialValue: 100, size: 3 });

    expect(screen.getByText('$100 on Yes to win $3')).toBeOnTheScreen();
  });

  it('formats size with 2 decimal places', () => {
    renderComponent({ size: 10.5555, initialValue: 200 });

    expect(screen.getByText('$200 on Yes to win $10.56')).toBeOnTheScreen();
  });

  it('renders all position properties correctly', () => {
    const position: PredictPositionType = {
      id: 'test-id',
      providerId: 'test-provider',
      marketId: 'test-market',
      outcomeId: 'test-outcome',
      outcomeTokenId: '1',
      icon: 'https://test.com/icon.png',
      title: 'Test Market Question?',
      outcome: 'Maybe',
      outcomeIndex: 1,
      amount: 50,
      price: 0.8,
      status: PredictPositionStatus.WON,
      size: 7.5,
      cashPnl: 25.5,
      percentPnl: 15.75,
      initialValue: 75.25,
      currentValue: 100.75,
      avgPrice: 0.625,
      claimable: true,
      endDate: '2026-01-01T00:00:00Z',
    };
    render(<PredictPosition position={position} />);

    expect(screen.getByText('Test Market Question?')).toBeOnTheScreen();
    expect(screen.getByText('$75.25 on Maybe to win $7.50')).toBeOnTheScreen();
    expect(screen.getByText('$100.75')).toBeOnTheScreen();
    expect(screen.getByText('15.75%')).toBeOnTheScreen();
  });

  describe('optimistic updates UI', () => {
    it('hides current value when position is optimistic', () => {
      renderComponent({ optimistic: true, currentValue: 2345.67 });

      expect(screen.queryByText('$2,345.67')).toBeNull();
    });

    it('hides percent PnL when position is optimistic', () => {
      renderComponent({ optimistic: true, percentPnl: 5.25 });

      expect(screen.queryByText('+5.25%')).toBeNull();
    });

    it('shows actual values when position is not optimistic', () => {
      renderComponent({ optimistic: false });

      expect(screen.getByText('$2,345.67')).toBeOnTheScreen();
      expect(screen.getByText('5.25%')).toBeOnTheScreen();
    });

    it('shows initial value line when optimistic', () => {
      renderComponent({ optimistic: true, initialValue: 123.45 });

      expect(screen.getByText('$123.45 on Yes to win $10')).toBeOnTheScreen();
    });
  });

  describe('optimistic position auto-refresh', () => {
    it('starts auto-refresh immediately when position is optimistic', async () => {
      mockLoadPositions.mockResolvedValue(undefined);
      renderComponent({ optimistic: true });

      await waitFor(() => {
        expect(mockLoadPositions).toHaveBeenCalledWith({ isRefresh: true });
      });
    });

    it('does not start auto-refresh when position is not optimistic', async () => {
      renderComponent({ optimistic: false });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });

      expect(mockLoadPositions).not.toHaveBeenCalled();
    });

    it('continues auto-refresh at 2-second intervals after each load completes', async () => {
      mockLoadPositions.mockResolvedValue(undefined);
      renderComponent({ optimistic: true });

      // First load happens immediately
      await waitFor(() => {
        expect(mockLoadPositions).toHaveBeenCalledTimes(1);
      });

      // Second load happens 2 seconds after first completes
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });

      expect(mockLoadPositions).toHaveBeenCalledTimes(2);

      // Third load happens 2 seconds after second completes
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });

      expect(mockLoadPositions).toHaveBeenCalledTimes(3);
    });

    it('stops auto-refresh when position becomes non-optimistic', async () => {
      const optimisticPosition = { ...basePosition, optimistic: true };
      const resolvedPosition = { ...basePosition, optimistic: false };

      mockLoadPositions.mockResolvedValue(undefined);
      mockUsePredictPositions.mockReturnValue({
        positions: [optimisticPosition],
        loadPositions: mockLoadPositions,
        isLoading: false,
        isRefreshing: false,
        error: null,
      });

      const { rerender } = renderComponent({ optimistic: true });

      // First load happens immediately
      await waitFor(() => {
        expect(mockLoadPositions).toHaveBeenCalledTimes(1);
      });

      mockLoadPositions.mockClear();

      mockUsePredictPositions.mockReturnValue({
        positions: [resolvedPosition],
        loadPositions: mockLoadPositions,
        isLoading: false,
        isRefreshing: false,
        error: null,
      });

      rerender(<PredictPosition position={resolvedPosition} />);

      await waitFor(() => {
        expect(screen.getByText('$2,345.67')).toBeOnTheScreen();
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });

      expect(mockLoadPositions).not.toHaveBeenCalled();
    });

    it('cleans up auto-refresh on unmount', async () => {
      mockLoadPositions.mockResolvedValue(undefined);
      const { unmount } = renderComponent({ optimistic: true });

      // First load happens immediately
      await waitFor(() => {
        expect(mockLoadPositions).toHaveBeenCalledTimes(1);
      });

      mockLoadPositions.mockClear();

      unmount();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });

      expect(mockLoadPositions).not.toHaveBeenCalled();
    });

    it('updates displayed position when positions hook returns new data', async () => {
      const optimisticPosition = {
        ...basePosition,
        optimistic: true,
        currentValue: 100,
        percentPnl: 0,
      };
      const resolvedPosition = {
        ...basePosition,
        optimistic: false,
        currentValue: 2500,
        percentPnl: 10.5,
      };

      mockUsePredictPositions.mockReturnValue({
        positions: [optimisticPosition],
        loadPositions: mockLoadPositions,
        isLoading: false,
        isRefreshing: false,
        error: null,
      });

      const { rerender } = renderComponent({ optimistic: true });

      expect(screen.queryByText('$2,500')).toBeNull();

      mockUsePredictPositions.mockReturnValue({
        positions: [resolvedPosition],
        loadPositions: mockLoadPositions,
        isLoading: false,
        isRefreshing: false,
        error: null,
      });

      rerender(<PredictPosition position={optimisticPosition} />);

      await waitFor(() => {
        expect(screen.getByText('$2,500')).toBeOnTheScreen();
        expect(screen.getByText('10.5%')).toBeOnTheScreen();
      });
    });

    it('calls onPress with updated position after refresh', async () => {
      const mockOnPress = jest.fn();
      const optimisticPosition = {
        ...basePosition,
        optimistic: true,
        currentValue: 100,
      };
      const resolvedPosition = {
        ...basePosition,
        optimistic: false,
        currentValue: 2500,
      };

      mockUsePredictPositions.mockReturnValue({
        positions: [optimisticPosition],
        loadPositions: mockLoadPositions,
        isLoading: false,
        isRefreshing: false,
        error: null,
      });

      const { rerender } = renderComponent({ optimistic: true }, mockOnPress);

      mockUsePredictPositions.mockReturnValue({
        positions: [resolvedPosition],
        loadPositions: mockLoadPositions,
        isLoading: false,
        isRefreshing: false,
        error: null,
      });

      rerender(
        <PredictPosition position={optimisticPosition} onPress={mockOnPress} />,
      );

      await waitFor(() => {
        expect(screen.getByText('$2,500')).toBeOnTheScreen();
      });

      fireEvent.press(
        screen.getByTestId(PredictPositionSelectorsIDs.CURRENT_POSITION_CARD),
      );

      expect(mockOnPress).toHaveBeenCalledWith(
        expect.objectContaining({
          currentValue: 2500,
          optimistic: false,
        }),
      );
    });
  });
});
