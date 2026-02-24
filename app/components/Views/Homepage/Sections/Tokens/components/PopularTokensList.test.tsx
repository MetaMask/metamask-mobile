import React from 'react';
import { render, waitFor, act, screen } from '@testing-library/react-native';
import PopularTokensList from './PopularTokensList';

// Mock usePopularTokens hook
const mockRefetch = jest.fn().mockResolvedValue(undefined);
const mockUsePopularTokens = jest.fn();

jest.mock('../hooks', () => ({
  usePopularTokens: () => mockUsePopularTokens(),
}));

// Mock PopularTokenRow to simplify testing
jest.mock('./PopularTokenRow', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ token }: { token: { name: string } }) => (
      <Text testID="popular-token-row">{token.name}</Text>
    ),
  };
});

// Mock PopularTokensSkeleton to avoid deep dependencies
jest.mock('./PopularTokensSkeleton', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="skeleton-placeholder" />,
  };
});

describe('PopularTokensList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock: loaded state with tokens
    mockUsePopularTokens.mockReturnValue({
      tokens: [
        {
          assetId: 'eip155:1/slip44:60',
          name: 'Ethereum',
          symbol: 'ETH',
          iconUrl: 'https://example.com/eth.png',
          price: 3000,
          priceChange1d: 2.5,
        },
      ],
      isInitialLoading: false,
      isRefreshing: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders skeleton placeholders during initial loading', () => {
    mockUsePopularTokens.mockReturnValue({
      tokens: [],
      isInitialLoading: true,
      isRefreshing: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<PopularTokensList />);

    expect(screen.getByTestId('skeleton-placeholder')).toBeOnTheScreen();
    expect(screen.queryByText('Ethereum')).toBeNull();
  });

  it('renders token rows when loaded', () => {
    const { getByText } = render(<PopularTokensList />);

    expect(getByText('Ethereum')).toBeOnTheScreen();
  });

  it('renders token rows during refresh (not skeleton)', () => {
    mockUsePopularTokens.mockReturnValue({
      tokens: [
        {
          assetId: 'eip155:1/slip44:60',
          name: 'Ethereum',
          symbol: 'ETH',
          iconUrl: 'https://example.com/eth.png',
          price: 3000,
          priceChange1d: 2.5,
        },
      ],
      isInitialLoading: false,
      isRefreshing: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<PopularTokensList />);

    // Should still show tokens during refresh, not skeleton
    expect(screen.getByText('Ethereum')).toBeOnTheScreen();
    expect(screen.queryByTestId('skeleton-placeholder')).toBeNull();
  });

  it('exposes refresh function via ref', async () => {
    const ref = React.createRef<{ refresh: () => Promise<void> }>();

    render(<PopularTokensList ref={ref} />);

    await act(async () => {
      await ref.current?.refresh();
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('auto-refreshes prices every 60 seconds', async () => {
    render(<PopularTokensList />);

    // Initial state - no auto-refresh calls yet
    expect(mockRefetch).not.toHaveBeenCalled();

    // Advance time by 60 seconds
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    // Advance time by another 60 seconds
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalledTimes(2);
    });
  });

  it('cleans up interval on unmount', async () => {
    const { unmount } = render(<PopularTokensList />);

    // Advance time by 60 seconds
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);

    // Unmount the component
    unmount();

    // Advance time - should not trigger more calls
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
