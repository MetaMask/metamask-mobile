import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { PriceUpdate } from '@metamask/perps-controller';
import PerpsPillItemWithLiveData from './PerpsPillItemWithLiveData';
import type { PerpsFeedItem } from '../../types/perpsFeedTypes';

const mockUsePerpsLivePrices = jest.fn();

jest.mock('../../hooks/stream', () => ({
  usePerpsLivePrices: (...args: unknown[]) => mockUsePerpsLivePrices(...args),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const buildItem = (
  symbol: string,
  change24hPercent = '+1.00%',
): PerpsFeedItem =>
  ({
    market: { symbol, change24hPercent },
    isWatchlisted: false,
  }) as PerpsFeedItem;

describe('PerpsPillItemWithLiveData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsLivePrices.mockReturnValue({});
  });

  it('subscribes to live prices for the pill symbol', () => {
    render(<PerpsPillItemWithLiveData item={buildItem('ETH')} />);

    expect(mockUsePerpsLivePrices).toHaveBeenCalledWith(
      expect.objectContaining({
        symbols: ['ETH'],
        throttleMs: 3000,
      }),
    );
  });

  it('renders the snapshot change percent when no live data is available', () => {
    render(<PerpsPillItemWithLiveData item={buildItem('ETH', '+2.50%')} />);

    expect(screen.getByText('+2.50%')).toBeOnTheScreen();
  });

  it('merges live percentChange24h into the pill', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: {
        symbol: 'ETH',
        price: '3500.00',
        percentChange24h: '7.89',
        timestamp: Date.now(),
      } as PriceUpdate,
    });

    render(<PerpsPillItemWithLiveData item={buildItem('ETH', '+1.00%')} />);

    expect(screen.getByText('+7.89%')).toBeOnTheScreen();
    expect(screen.queryByText('+1.00%')).toBeNull();
  });

  it('falls back to snapshot when percentChange24h is missing', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: {
        symbol: 'ETH',
        price: '3500.00',
        timestamp: Date.now(),
      } as PriceUpdate,
    });

    render(<PerpsPillItemWithLiveData item={buildItem('ETH', '+1.00%')} />);

    expect(screen.getByText('+1.00%')).toBeOnTheScreen();
  });

  it('falls back to snapshot when percentChange24h is NaN', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: {
        symbol: 'ETH',
        price: '3500.00',
        percentChange24h: 'invalid',
        timestamp: Date.now(),
      } as PriceUpdate,
    });

    render(<PerpsPillItemWithLiveData item={buildItem('ETH', '+1.00%')} />);

    expect(screen.getByText('+1.00%')).toBeOnTheScreen();
  });

  it('passes empty symbols when enabled is false', () => {
    render(
      <PerpsPillItemWithLiveData item={buildItem('ETH')} enabled={false} />,
    );

    expect(mockUsePerpsLivePrices).toHaveBeenCalledWith(
      expect.objectContaining({ symbols: [] }),
    );
  });
});
