import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsMarketRowItem from './PerpsMarketRowItem';
import type { PerpsMarketData } from '../../controllers/types';
import { getPerpsMarketRowItemSelector } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

const { TouchableOpacity } = jest.requireActual('react-native');

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => {
    const actualStyleSheet = jest.requireActual(
      './PerpsMarketRowItem.styles',
    ).default;
    const mockTheme = {
      colors: {
        background: { default: '#FFFFFF', muted: '#F2F4F6' },
        text: { default: '#24272A', muted: '#6A737D' },
      },
    };
    return { styles: actualStyleSheet({ theme: mockTheme }) };
  }),
}));

// Mock PerpsTokenLogo
jest.mock('../PerpsTokenLogo', () => {
  const { View } = jest.requireActual('react-native');
  return function MockPerpsTokenLogo({
    symbol,
    testID,
  }: {
    symbol: string;
    testID?: string;
  }) {
    return <View testID={testID || 'perps-token-logo'} data-symbol={symbol} />;
  };
});

jest.mock('../../hooks/stream', () => ({
  usePerpsLivePrices: jest.fn(() => ({})), // Return empty object - no live prices in tests
}));

const { usePerpsLivePrices } = jest.requireMock('../../hooks/stream');
const mockUsePerpsLivePrices = usePerpsLivePrices as jest.MockedFunction<
  typeof usePerpsLivePrices
>;

// Mock react-redux for AvatarToken component
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => false), // Mock selectIsIpfsGatewayEnabled to return false
}));

describe('PerpsMarketRowItem', () => {
  const mockMarketData: PerpsMarketData = {
    symbol: 'BTC',
    name: 'Bitcoin',
    maxLeverage: '50x',
    price: '$52,000',
    change24h: '+$2,000',
    change24hPercent: '+4.00%',
    volume: '$2.5B',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders all market data correctly', () => {
      render(<PerpsMarketRowItem market={mockMarketData} />);

      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.getByText('50x')).toBeOnTheScreen();
      expect(screen.getByText('$52,000')).toBeOnTheScreen();
      expect(screen.getByText('+4.00%')).toBeOnTheScreen();
      expect(screen.getByText('$2.5B Vol')).toBeOnTheScreen();
    });

    it('renders as a touchable component', () => {
      render(<PerpsMarketRowItem market={mockMarketData} />);

      const touchableElements = screen.root.findAllByType(TouchableOpacity);
      expect(touchableElements).toHaveLength(1);
    });
  });

  describe('Asset Image Handling', () => {
    it('renders PerpsTokenLogo component', () => {
      render(<PerpsMarketRowItem market={mockMarketData} />);

      const tokenLogo = screen.getByTestId(
        getPerpsMarketRowItemSelector.tokenLogo('BTC'),
      );
      expect(tokenLogo).toBeOnTheScreen();
      expect(tokenLogo.props['data-symbol']).toBe('BTC');
    });
  });

  describe('Interaction Handling', () => {
    it('calls onPress callback when pressed', () => {
      const mockOnPress = jest.fn();
      render(
        <PerpsMarketRowItem market={mockMarketData} onPress={mockOnPress} />,
      );

      const touchableOpacity = screen.root.findByType(TouchableOpacity);
      fireEvent.press(touchableOpacity);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockOnPress).toHaveBeenCalledWith(mockMarketData);
    });

    it('does not throw error when onPress is undefined', () => {
      render(<PerpsMarketRowItem market={mockMarketData} />);

      const touchableOpacity = screen.root.findByType(TouchableOpacity);
      expect(() => fireEvent.press(touchableOpacity)).not.toThrow();
    });

    it('does not throw error when onPress is null', () => {
      render(
        <PerpsMarketRowItem market={mockMarketData} onPress={undefined} />,
      );

      const touchableOpacity = screen.root.findByType(TouchableOpacity);
      expect(() => fireEvent.press(touchableOpacity)).not.toThrow();
    });
  });

  describe('Market Data Variations', () => {
    it('handles different symbols correctly', () => {
      const ethMarket = {
        ...mockMarketData,
        symbol: 'ETH',
        name: 'Ethereum',
      };

      render(<PerpsMarketRowItem market={ethMarket} />);

      expect(screen.getByText('ETH')).toBeOnTheScreen();
      expect(
        screen.getByTestId(getPerpsMarketRowItemSelector.rowItem('ETH')),
      ).toBeOnTheScreen();
    });

    it('handles different leverage values', () => {
      const customLeverageMarket = {
        ...mockMarketData,
        maxLeverage: '25x',
      };

      render(<PerpsMarketRowItem market={customLeverageMarket} />);

      expect(screen.getByText('25x')).toBeOnTheScreen();
    });

    it('handles different price formats', () => {
      const customPriceMarket = {
        ...mockMarketData,
        price: '$0.1234',
      };

      render(<PerpsMarketRowItem market={customPriceMarket} />);

      expect(screen.getByText('$0.1234')).toBeOnTheScreen();
    });

    it('handles different volume formats', () => {
      const customVolumeMarket = {
        ...mockMarketData,
        volume: '$150M',
      };

      render(<PerpsMarketRowItem market={customVolumeMarket} />);

      expect(screen.getByText('$150M Vol')).toBeOnTheScreen();
    });

    it('handles large price changes', () => {
      const largePriceChangeMarket = {
        ...mockMarketData,
        change24h: '+$25,000',
        change24hPercent: '+85.50%',
      };

      render(<PerpsMarketRowItem market={largePriceChangeMarket} />);

      expect(screen.getByText('+85.50%')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long symbol names', () => {
      const longSymbolMarket = {
        ...mockMarketData,
        symbol: 'VERYLONGSYMBOLNAME',
      };

      render(<PerpsMarketRowItem market={longSymbolMarket} />);

      expect(screen.getByText('VERYLONGSYMBOLNAME')).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          getPerpsMarketRowItemSelector.rowItem('VERYLONGSYMBOLNAME'),
        ),
      ).toBeOnTheScreen();
    });

    it('handles special characters in market data', () => {
      const specialCharMarket = {
        ...mockMarketData,
        symbol: 'BTC/USD',
        change24h: '+$1,000',
        change24hPercent: '+2.50%',
      };

      render(<PerpsMarketRowItem market={specialCharMarket} />);

      expect(screen.getByText('BTC/USD')).toBeOnTheScreen();
      expect(screen.getByText('+2.50%')).toBeOnTheScreen();
    });

    it('handles unicode characters', () => {
      const unicodeMarket = {
        ...mockMarketData,
        symbol: 'BTC€',
        price: '€45,000',
        change24h: '+€2,000',
        change24hPercent: '+4.65%',
      };

      render(<PerpsMarketRowItem market={unicodeMarket} />);

      expect(screen.getByText('BTC€')).toBeOnTheScreen();
      expect(screen.getByText('€45,000')).toBeOnTheScreen();
    });
  });

  describe('Component Structure', () => {
    it('maintains correct component hierarchy', () => {
      const { root } = render(<PerpsMarketRowItem market={mockMarketData} />);

      // Should have a TouchableOpacity as root
      const touchableOpacity = root.findByType(TouchableOpacity);
      expect(touchableOpacity).toBeTruthy();
    });

    it('uses correct testID for avatar', () => {
      const customMarket = {
        ...mockMarketData,
        symbol: 'ETH',
      };

      render(<PerpsMarketRowItem market={customMarket} />);

      const avatar = screen.getByTestId(
        getPerpsMarketRowItemSelector.tokenLogo('ETH'),
      );
      expect(avatar).toBeOnTheScreen();

      // Also assert the row container keeps its own testID
      const rowItem = screen.getByTestId(
        getPerpsMarketRowItemSelector.rowItem('ETH'),
      );
      expect(rowItem).toBeOnTheScreen();
    });
  });

  describe('Multiple Press Handling', () => {
    it('handles multiple rapid presses correctly', () => {
      const mockOnPress = jest.fn();
      render(
        <PerpsMarketRowItem market={mockMarketData} onPress={mockOnPress} />,
      );

      const touchableOpacity = screen.root.findByType(TouchableOpacity);

      fireEvent.press(touchableOpacity);
      fireEvent.press(touchableOpacity);
      fireEvent.press(touchableOpacity);

      expect(mockOnPress).toHaveBeenCalledTimes(3);
      expect(mockOnPress).toHaveBeenCalledWith(mockMarketData);
    });
  });

  describe('Live Price Updates', () => {
    beforeEach(() => {
      // Reset the mock to default empty object
      mockUsePerpsLivePrices.mockReturnValue({});
    });

    it('subscribes to live prices with correct parameters', () => {
      render(<PerpsMarketRowItem market={mockMarketData} />);

      expect(mockUsePerpsLivePrices).toHaveBeenCalledWith({
        symbols: ['BTC'],
        throttleMs: 3000,
      });
    });

    it('updates price when live price is available', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          price: '55000.00',
          percentChange24h: '5.77',
          volume24h: 3000000000,
        },
      });

      render(<PerpsMarketRowItem market={mockMarketData} />);

      // Should show the new live price
      expect(screen.getByText('$55,000')).toBeOnTheScreen();
      // Should show updated volume (2 decimals with formatVolume)
      expect(screen.getByText('$3.00B Vol')).toBeOnTheScreen();
    });

    it('does not update when live price matches current price', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          price: '52000.00', // Same as mockMarketData.price
          percentChange24h: '4.00',
          volume24h: 2500000000,
        },
      });

      render(<PerpsMarketRowItem market={mockMarketData} />);

      // Should keep original data when price is the same
      expect(screen.getByText('$52,000')).toBeOnTheScreen();
      expect(screen.getByText('+4.00%')).toBeOnTheScreen();
    });

    it('handles negative price changes correctly', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          price: '48000.00',
          percentChange24h: '-7.84',
          volume24h: 2000000000,
        },
      });

      render(<PerpsMarketRowItem market={mockMarketData} />);

      expect(screen.getByText('$48,000')).toBeOnTheScreen();
    });

    it('handles zero percent change correctly', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          price: '50000.00',
          percentChange24h: '0',
          volume24h: 1500000000,
        },
      });

      render(<PerpsMarketRowItem market={mockMarketData} />);

      expect(screen.getByText('$50,000')).toBeOnTheScreen();
    });

    it('handles -100% change correctly', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          price: '0.00',
          percentChange24h: '-100',
          volume24h: 0,
        },
      });

      render(<PerpsMarketRowItem market={mockMarketData} />);

      // Price shows $0, volume shows $0.00 Vol
      expect(screen.getByText('$0')).toBeOnTheScreen();
      expect(screen.getByText('$0.00 Vol')).toBeOnTheScreen();
    });

    it('formats different volume ranges correctly', () => {
      // Test billions (2 decimals with formatVolume)
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: { price: '50000', volume24h: 5500000000 },
      });
      const { rerender } = render(
        <PerpsMarketRowItem market={mockMarketData} />,
      );
      expect(screen.getByText('$5.50B Vol')).toBeOnTheScreen(); // B shows 2 decimals

      // Test millions (2 decimals with formatVolume)
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: { price: '50000', volume24h: 750000000 },
      });
      rerender(<PerpsMarketRowItem market={{ ...mockMarketData }} />);
      expect(screen.getByText('$750.00M Vol')).toBeOnTheScreen(); // M shows 2 decimals

      // Test thousands (0 decimals with formatVolume)
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: { price: '50000', volume24h: 50000 },
      });
      rerender(<PerpsMarketRowItem market={{ ...mockMarketData }} />);
      expect(screen.getByText('$50K Vol')).toBeOnTheScreen(); // K shows no decimals

      // Test small values (2 decimals with formatVolume)
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: { price: '50000', volume24h: 123.45 },
      });
      rerender(<PerpsMarketRowItem market={{ ...mockMarketData }} />);
      expect(screen.getByText('$123.45 Vol')).toBeOnTheScreen(); // Shows 2 decimals
    });

    it('handles missing live price fields gracefully', () => {
      // Only price provided
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: { price: '53000.00' },
      });

      render(<PerpsMarketRowItem market={mockMarketData} />);

      expect(screen.getByText('$53,000')).toBeOnTheScreen();
      // Should keep original change data when percentChange24h is missing
      expect(screen.getByText('+4.00%')).toBeOnTheScreen();
      // Should keep original volume when volume24h is missing
      expect(screen.getByText('$2.5B Vol')).toBeOnTheScreen();
    });

    it('handles live prices for multiple symbols independently', () => {
      const ethMarket: PerpsMarketData = {
        symbol: 'ETH',
        name: 'Ethereum',
        maxLeverage: '25x',
        price: '$3,000',
        change24h: '-$50',
        change24hPercent: '-1.64%',
        volume: '$1.2B',
      };

      // Mock live prices for both BTC and ETH
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: { price: '55000.00' },
        ETH: { price: '3200.00' },
      });

      // Render ETH market
      render(<PerpsMarketRowItem market={ethMarket} />);

      // Should only subscribe to ETH
      expect(mockUsePerpsLivePrices).toHaveBeenCalledWith({
        symbols: ['ETH'],
        throttleMs: 3000,
      });

      // Should show ETH's live price, not BTC's
      expect(screen.getByText('$3,200')).toBeOnTheScreen();
    });

    it('passes updated market data to onPress callback', () => {
      const mockOnPress = jest.fn();

      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          price: '55000.00',
          percentChange24h: '5.77',
          volume24h: 3000000000,
        },
      });

      render(
        <PerpsMarketRowItem market={mockMarketData} onPress={mockOnPress} />,
      );

      const touchableOpacity = screen.root.findByType(TouchableOpacity);
      fireEvent.press(touchableOpacity);

      // Should pass the updated market data with live prices
      expect(mockOnPress).toHaveBeenCalledTimes(1);
      // Verify it was called with an object containing the symbol
      expect(mockOnPress.mock.calls[0][0].symbol).toBe('BTC');
    });

    it('handles very small price values', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          price: '0.000123',
          percentChange24h: '15.5',
          volume24h: 1000,
        },
      });

      render(<PerpsMarketRowItem market={mockMarketData} />);

      // With PRICE_RANGES_UNIVERSAL, small prices use appropriate precision
      expect(screen.getByText('$0.000123')).toBeOnTheScreen();
    });

    it('handles very large price values', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          price: '99999999.99',
          percentChange24h: '2.5',
          volume24h: 10000000000,
        },
      });

      render(<PerpsMarketRowItem market={mockMarketData} />);

      // With 5 significant digits, this rounds to $100,000,000 (trailing zeros removed)
      expect(screen.getByText('$100,000,000')).toBeOnTheScreen();
      expect(screen.getByText('+2.50%')).toBeOnTheScreen();
      expect(screen.getByText('$10.00B Vol')).toBeOnTheScreen();
    });
  });

  describe('Price Change Color Indication', () => {
    it('shows positive change', () => {
      const positiveMarket = {
        ...mockMarketData,
        change24h: '+$500',
        change24hPercent: '+1.00%',
      };

      render(<PerpsMarketRowItem market={positiveMarket} />);

      // Verify the component renders without error
      expect(screen.getByText(positiveMarket.symbol)).toBeOnTheScreen();
    });

    it('shows negative change', () => {
      const negativeMarket = {
        ...mockMarketData,
        change24h: '-$500',
        change24hPercent: '-1.00%',
      };

      render(<PerpsMarketRowItem market={negativeMarket} />);

      // Verify the component renders without error
      expect(screen.getByText(negativeMarket.symbol)).toBeOnTheScreen();
    });

    it('handles zero change correctly', () => {
      const zeroChangeMarket = {
        ...mockMarketData,
        change24h: '+$0',
        change24hPercent: '+0.00%',
      };

      render(<PerpsMarketRowItem market={zeroChangeMarket} />);

      // Verify the component renders without error
      expect(screen.getByText(zeroChangeMarket.symbol)).toBeOnTheScreen();
    });
  });

  describe('Funding Rate Display', () => {
    beforeEach(() => {
      // Reset mock to return no live prices for these tests
      mockUsePerpsLivePrices.mockReturnValue({});
    });

    it('displays funding rate when displayMetric is fundingRate', () => {
      const marketWithFundingRate: PerpsMarketData = {
        ...mockMarketData,
        fundingRate: 0.0005, // 0.05% when formatted
      };

      render(
        <PerpsMarketRowItem
          market={marketWithFundingRate}
          displayMetric="fundingRate"
        />,
      );

      // Should display formatted funding rate using formatFundingRate utility
      expect(screen.getByText('0.0500% Funding')).toBeOnTheScreen();
    });

    it('displays negative funding rate correctly', () => {
      const marketWithNegativeFundingRate: PerpsMarketData = {
        ...mockMarketData,
        fundingRate: -0.0023, // -0.23% when formatted
      };

      render(
        <PerpsMarketRowItem
          market={marketWithNegativeFundingRate}
          displayMetric="fundingRate"
        />,
      );

      // Should display negative funding rate
      expect(screen.getByText('-0.2300% Funding')).toBeOnTheScreen();
    });

    it('displays zero funding rate when fundingRate is undefined', () => {
      const marketWithoutFundingRate: PerpsMarketData = {
        ...mockMarketData,
        fundingRate: undefined,
      };

      render(
        <PerpsMarketRowItem
          market={marketWithoutFundingRate}
          displayMetric="fundingRate"
        />,
      );

      // Should display zero funding rate using formatFundingRate utility
      expect(screen.getByText('0.0000% Funding')).toBeOnTheScreen();
    });

    it('displays zero funding rate when fundingRate is null', () => {
      const marketWithNullFundingRate: PerpsMarketData = {
        ...mockMarketData,
        fundingRate: null as unknown as number,
      };

      render(
        <PerpsMarketRowItem
          market={marketWithNullFundingRate}
          displayMetric="fundingRate"
        />,
      );

      // Should display zero funding rate
      expect(screen.getByText('0.0000% Funding')).toBeOnTheScreen();
    });

    it('displays zero funding rate when fundingRate is 0', () => {
      const marketWithZeroFundingRate: PerpsMarketData = {
        ...mockMarketData,
        fundingRate: 0,
      };

      render(
        <PerpsMarketRowItem
          market={marketWithZeroFundingRate}
          displayMetric="fundingRate"
        />,
      );

      // Should display zero funding rate
      expect(screen.getByText('0.0000% Funding')).toBeOnTheScreen();
    });

    it('updates funding rate from live WebSocket data', () => {
      const marketWithInitialFundingRate: PerpsMarketData = {
        ...mockMarketData,
        fundingRate: 0.0001, // Initial: 0.01%
      };

      // Mock live funding rate update
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          price: '52000.00', // Same price to test funding rate update without price change
          funding: 0.0005, // Updated: 0.05%
        },
      });

      render(
        <PerpsMarketRowItem
          market={marketWithInitialFundingRate}
          displayMetric="fundingRate"
        />,
      );

      // Should display the updated live funding rate
      expect(screen.getByText('0.0500% Funding')).toBeOnTheScreen();
    });

    it('updates funding rate even when price has not changed', () => {
      const marketWithInitialFundingRate: PerpsMarketData = {
        ...mockMarketData,
        price: '$52,000',
        fundingRate: 0.0001, // Initial: 0.01%
      };

      // Mock live data with same price but different funding rate
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          price: '52000.00', // Same as market.price when formatted
          funding: 0.0012, // Updated: 0.12%
        },
      });

      render(
        <PerpsMarketRowItem
          market={marketWithInitialFundingRate}
          displayMetric="fundingRate"
        />,
      );

      // Should display the updated funding rate even though price didn't change
      expect(screen.getByText('0.1200% Funding')).toBeOnTheScreen();
      // Price should remain the same
      expect(screen.getByText('$52,000')).toBeOnTheScreen();
    });

    it('does not update when funding rate has not changed', () => {
      const marketWithFundingRate: PerpsMarketData = {
        ...mockMarketData,
        price: '$52,000',
        fundingRate: 0.0005, // 0.05%
      };

      // Mock live data with same price and same funding rate
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          price: '52000.00', // Same price
          funding: 0.0005, // Same funding rate
        },
      });

      render(
        <PerpsMarketRowItem
          market={marketWithFundingRate}
          displayMetric="fundingRate"
        />,
      );

      // Should display the original funding rate
      expect(screen.getByText('0.0500% Funding')).toBeOnTheScreen();
    });

    it('handles very small funding rates correctly', () => {
      mockUsePerpsLivePrices.mockReturnValue({});
      const marketWithSmallFundingRate: PerpsMarketData = {
        ...mockMarketData,
        fundingRate: 0.000001, // 0.0001% when formatted
      };

      render(
        <PerpsMarketRowItem
          market={marketWithSmallFundingRate}
          displayMetric="fundingRate"
        />,
      );

      // Should display with 4 decimal places
      expect(screen.getByText('0.0001% Funding')).toBeOnTheScreen();
    });

    it('handles large funding rates correctly', () => {
      mockUsePerpsLivePrices.mockReturnValue({});
      const marketWithLargeFundingRate: PerpsMarketData = {
        ...mockMarketData,
        fundingRate: 0.1575, // 15.75% when formatted
      };

      render(
        <PerpsMarketRowItem
          market={marketWithLargeFundingRate}
          displayMetric="fundingRate"
        />,
      );

      // Should display with 4 decimal places
      expect(screen.getByText('15.7500% Funding')).toBeOnTheScreen();
    });

    it('uses formatFundingRate utility for consistent formatting', () => {
      mockUsePerpsLivePrices.mockReturnValue({});
      const marketWithFundingRate: PerpsMarketData = {
        ...mockMarketData,
        fundingRate: 0.0125, // 1.25% when formatted
      };

      render(
        <PerpsMarketRowItem
          market={marketWithFundingRate}
          displayMetric="fundingRate"
        />,
      );

      // Should use formatFundingRate which formats to 4 decimal places
      // This ensures consistency with PerpsMarketStatisticsCard
      expect(screen.getByText('1.2500% Funding')).toBeOnTheScreen();
    });

    it('passes updated funding rate to onPress callback', () => {
      const mockOnPress = jest.fn();
      const marketWithInitialFundingRate: PerpsMarketData = {
        ...mockMarketData,
        fundingRate: 0.0001,
      };

      // Mock live funding rate update
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          price: '52000.00',
          funding: 0.0005, // Updated funding rate
        },
      });

      render(
        <PerpsMarketRowItem
          market={marketWithInitialFundingRate}
          displayMetric="fundingRate"
          onPress={mockOnPress}
        />,
      );

      const touchableOpacity = screen.root.findByType(TouchableOpacity);
      fireEvent.press(touchableOpacity);

      // Should pass the updated market data with live funding rate
      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockOnPress.mock.calls[0][0].fundingRate).toBe(0.0005);
    });

    it('handles funding rate update when live data funding is undefined', () => {
      const marketWithFundingRate: PerpsMarketData = {
        ...mockMarketData,
        fundingRate: 0.0005, // Initial: 0.05%
      };

      // Mock live data without funding rate
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          price: '52000.00',
          // funding is undefined
        },
      });

      render(
        <PerpsMarketRowItem
          market={marketWithFundingRate}
          displayMetric="fundingRate"
        />,
      );

      // Should keep the original funding rate when live data doesn't have funding
      expect(screen.getByText('0.0500% Funding')).toBeOnTheScreen();
    });
  });
});
