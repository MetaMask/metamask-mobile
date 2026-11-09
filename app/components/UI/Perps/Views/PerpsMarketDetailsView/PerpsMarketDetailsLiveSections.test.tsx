import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { type PriceUpdate } from '@metamask/perps-controller';
import {
  PerpsCurrentPriceSync,
  PerpsLiveCurrentPrice,
  PerpsLiveMarketStatisticsCard,
} from './PerpsMarketDetailsLiveSections';

const mockUsePerpsLivePrices = jest.fn();
const mockUsePerpsLiveFocusedPrice = jest.fn();
const mockUsePerpsMarketStats = jest.fn();

jest.mock('../../hooks/stream', () => ({
  usePerpsLivePrices: (options: unknown) => mockUsePerpsLivePrices(options),
  usePerpsLiveFocusedPrice: (options: unknown) =>
    mockUsePerpsLiveFocusedPrice(options),
}));

jest.mock('../../hooks/usePerpsMarketStats', () => ({
  usePerpsMarketStats: (symbol: string) => mockUsePerpsMarketStats(symbol),
}));

jest.mock('../../components/PerpsMarketStatisticsCard', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ symbol }: { symbol: string }) => (
      <MockText testID="statistics-card">{symbol}</MockText>
    ),
  };
});

const priceUpdate = (overrides: Partial<PriceUpdate>): PriceUpdate => ({
  symbol: 'BTC',
  price: '50000',
  timestamp: 1,
  isTradable: true,
  ...overrides,
});

const renderPrice = (enabled?: boolean) =>
  render(
    <PerpsLiveCurrentPrice symbol="BTC" enabled={enabled}>
      {(price) => <Text testID="price">{price}</Text>}
    </PerpsLiveCurrentPrice>,
  );

describe('PerpsMarketDetailsLiveSections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsLivePrices.mockReturnValue({});
    mockUsePerpsLiveFocusedPrice.mockReturnValue(undefined);
  });

  describe('PerpsLiveCurrentPrice', () => {
    it('prefers the focused mark price', () => {
      mockUsePerpsLiveFocusedPrice.mockReturnValue(
        priceUpdate({ markPrice: '50050' }),
      );
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: priceUpdate({ price: '49000' }),
      });

      renderPrice();

      expect(screen.getByTestId('price')).toHaveTextContent('50050');
    });

    it('falls back to the allMids price before the first focused tick', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: priceUpdate({ price: '49000' }),
      });

      renderPrice();

      expect(screen.getByTestId('price')).toHaveTextContent('49000');
    });

    it('closes both subscriptions and renders 0 when disabled', () => {
      renderPrice(false);

      expect(mockUsePerpsLivePrices).toHaveBeenCalledWith(
        expect.objectContaining({ symbols: [] }),
      );
      expect(mockUsePerpsLiveFocusedPrice).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
      expect(screen.getByTestId('price')).toHaveTextContent('0');
    });
  });

  describe('PerpsCurrentPriceSync', () => {
    it('reports the latest price', () => {
      mockUsePerpsLiveFocusedPrice.mockReturnValue(
        priceUpdate({ markPrice: '50050' }),
      );
      const onPriceChange = jest.fn();

      render(
        <PerpsCurrentPriceSync symbol="BTC" onPriceChange={onPriceChange} />,
      );

      expect(onPriceChange).toHaveBeenLastCalledWith(50050);
    });
  });

  describe('PerpsLiveMarketStatisticsCard', () => {
    const renderStatsCard = (onSectionStateChange = jest.fn()) => {
      render(
        <PerpsLiveMarketStatisticsCard
          symbol="BTC"
          onTooltipPress={jest.fn()}
          onSectionStateChange={onSectionStateChange}
        />,
      );
      return onSectionStateChange;
    };

    it('renders the statistics card for the symbol', () => {
      mockUsePerpsMarketStats.mockReturnValue({ hasError: false });

      renderStatsCard();

      expect(screen.getByTestId('statistics-card')).toHaveTextContent('BTC');
      expect(mockUsePerpsMarketStats).toHaveBeenCalledWith('BTC');
    });

    it('reports content once live stats for the symbol arrive', () => {
      mockUsePerpsMarketStats.mockReturnValue({
        hasError: false,
        hasLiveData: true,
        dataSymbol: 'BTC',
      });

      const onSectionStateChange = renderStatsCard();

      expect(onSectionStateChange).toHaveBeenLastCalledWith('content');
    });

    it('reports loading while live stats belong to another symbol', () => {
      mockUsePerpsMarketStats.mockReturnValue({
        hasError: false,
        hasLiveData: true,
        dataSymbol: 'ETH',
      });

      const onSectionStateChange = renderStatsCard();

      expect(onSectionStateChange).toHaveBeenLastCalledWith('loading');
    });

    it('reports error when stats fail', () => {
      mockUsePerpsMarketStats.mockReturnValue({ hasError: true });

      const onSectionStateChange = renderStatsCard();

      expect(onSectionStateChange).toHaveBeenLastCalledWith('error');
    });
  });
});
