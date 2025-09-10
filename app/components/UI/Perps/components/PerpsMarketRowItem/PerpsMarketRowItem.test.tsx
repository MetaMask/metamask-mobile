import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsMarketRowItem from './PerpsMarketRowItem';
import type { PerpsMarketData } from '../../controllers/types';
import { getPerpsMarketRowItemSelector } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

const { TouchableOpacity } = jest.requireActual('react-native');

// Mock dependencies
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
    price: '$52,000.00',
    change24h: '+$2,000.00',
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
      expect(screen.getByText('$52,000.00')).toBeOnTheScreen();
      expect(screen.getByText('+4.00%')).toBeOnTheScreen();
      expect(screen.getByText('$2.5B')).toBeOnTheScreen();
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

      expect(screen.getByText('$150M')).toBeOnTheScreen();
    });

    it('handles large price changes', () => {
      const largePriceChangeMarket = {
        ...mockMarketData,
        change24h: '+$25,000.00',
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
        change24h: '+$1,000.00',
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
        price: '€45,000.00',
        change24h: '+€2,000.00',
        change24hPercent: '+4.65%',
      };

      render(<PerpsMarketRowItem market={unicodeMarket} />);

      expect(screen.getByText('BTC€')).toBeOnTheScreen();
      expect(screen.getByText('€45,000.00')).toBeOnTheScreen();
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
      expect(screen.getByText('$55,000.00')).toBeOnTheScreen();
      // Should show updated volume (2 decimals with formatVolume)
      expect(screen.getByText('$3.00B')).toBeOnTheScreen();
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
      expect(screen.getByText('$52,000.00')).toBeOnTheScreen();
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

      expect(screen.getByText('$48,000.00')).toBeOnTheScreen();
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

      expect(screen.getByText('$50,000.00')).toBeOnTheScreen();
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

      // Price and volume both show $0.00, so check for multiple instances
      const zeroElements = screen.getAllByText('$0.00');
      expect(zeroElements.length).toBeGreaterThanOrEqual(1);
    });

    it('formats different volume ranges correctly', () => {
      // Test billions (2 decimals with formatVolume)
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: { price: '50000', volume24h: 5500000000 },
      });
      const { rerender } = render(
        <PerpsMarketRowItem market={mockMarketData} />,
      );
      expect(screen.getByText('$5.50B')).toBeOnTheScreen(); // B shows 2 decimals

      // Test millions (2 decimals with formatVolume)
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: { price: '50000', volume24h: 750000000 },
      });
      rerender(<PerpsMarketRowItem market={mockMarketData} />);
      expect(screen.getByText('$750.00M')).toBeOnTheScreen(); // M shows 2 decimals

      // Test thousands (0 decimals with formatVolume)
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: { price: '50000', volume24h: 50000 },
      });
      rerender(<PerpsMarketRowItem market={mockMarketData} />);
      expect(screen.getByText('$50K')).toBeOnTheScreen(); // K shows no decimals

      // Test small values (2 decimals with formatVolume)
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: { price: '50000', volume24h: 123.45 },
      });
      rerender(<PerpsMarketRowItem market={mockMarketData} />);
      expect(screen.getByText('$123.45')).toBeOnTheScreen(); // Shows 2 decimals
    });

    it('handles missing live price fields gracefully', () => {
      // Only price provided
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: { price: '53000.00' },
      });

      render(<PerpsMarketRowItem market={mockMarketData} />);

      expect(screen.getByText('$53,000.00')).toBeOnTheScreen();
      // Should keep original change data when percentChange24h is missing
      expect(screen.getByText('+4.00%')).toBeOnTheScreen();
      // Should keep original volume when volume24h is missing
      expect(screen.getByText('$2.5B')).toBeOnTheScreen();
    });

    it('handles live prices for multiple symbols independently', () => {
      const ethMarket: PerpsMarketData = {
        symbol: 'ETH',
        name: 'Ethereum',
        maxLeverage: '25x',
        price: '$3,000.00',
        change24h: '-$50.00',
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
      expect(screen.getByText('$3,200.00')).toBeOnTheScreen();
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

      // With 2 decimal enforcement, very small prices show as $0.00
      expect(screen.getByText('$0.00')).toBeOnTheScreen();
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

      expect(screen.getByText('$99,999,999.99')).toBeOnTheScreen();
    });
  });

  describe('Price Change Color Indication', () => {
    it('shows positive change', () => {
      const positiveMarket = {
        ...mockMarketData,
        change24h: '+$500.00',
        change24hPercent: '+1.00%',
      };

      render(<PerpsMarketRowItem market={positiveMarket} />);

      // Verify the component renders without error
      expect(screen.getByText(positiveMarket.symbol)).toBeOnTheScreen();
    });

    it('shows negative change', () => {
      const negativeMarket = {
        ...mockMarketData,
        change24h: '-$500.00',
        change24hPercent: '-1.00%',
      };

      render(<PerpsMarketRowItem market={negativeMarket} />);

      // Verify the component renders without error
      expect(screen.getByText(negativeMarket.symbol)).toBeOnTheScreen();
    });

    it('handles zero change correctly', () => {
      const zeroChangeMarket = {
        ...mockMarketData,
        change24h: '+$0.00',
        change24hPercent: '+0.00%',
      };

      render(<PerpsMarketRowItem market={zeroChangeMarket} />);

      // Verify the component renders without error
      expect(screen.getByText(zeroChangeMarket.symbol)).toBeOnTheScreen();
    });
  });
});
