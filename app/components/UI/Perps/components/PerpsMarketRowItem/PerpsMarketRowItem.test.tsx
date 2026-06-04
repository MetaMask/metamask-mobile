import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import PerpsMarketRowItem from './PerpsMarketRowItem';
import { type PerpsMarketData } from '@metamask/perps-controller';
import { getPerpsMarketRowItemSelector } from '../../Perps.testIds';

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
  usePerpsLivePrices: jest.fn(() => ({})),
  usePerpsLiveMarket: jest.fn((market) => market), // Return market as-is — no live prices in tests
}));

const { usePerpsLiveMarket } = jest.requireMock('../../hooks/stream');
const mockUsePerpsLiveMarket = usePerpsLiveMarket as jest.MockedFunction<
  typeof usePerpsLiveMarket
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

      const rowItem = screen.getByTestId(
        getPerpsMarketRowItemSelector.rowItem('BTC'),
      );
      expect(rowItem).toBeOnTheScreen();
    });
  });

  describe('Asset Image Handling', () => {
    it('renders PerpsTokenLogo component', () => {
      render(<PerpsMarketRowItem market={mockMarketData} />);

      const tokenLogo = screen.getByTestId(
        getPerpsMarketRowItemSelector.tokenLogo('BTC'),
      );
      expect(tokenLogo).toBeOnTheScreen();
      // data-symbol not available on host elements
    });
  });

  describe('Interaction Handling', () => {
    it('calls onPress callback when pressed', async () => {
      const mockOnPress = jest.fn();
      render(
        <PerpsMarketRowItem market={mockMarketData} onPress={mockOnPress} />,
      );

      const rowItem = screen.getByTestId(
        getPerpsMarketRowItemSelector.rowItem('BTC'),
      );
      fireEvent.press(rowItem);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockOnPress).toHaveBeenCalledWith(mockMarketData);
    });

    it('does not throw error when onPress is undefined', () => {
      render(<PerpsMarketRowItem market={mockMarketData} />);

      const rowItem = screen.getByTestId(
        getPerpsMarketRowItemSelector.rowItem('BTC'),
      );
      expect(() => fireEvent.press(rowItem)).not.toThrow();
    });

    it('does not throw error when onPress is null', () => {
      render(
        <PerpsMarketRowItem market={mockMarketData} onPress={undefined} />,
      );

      const rowItem = screen.getByTestId(
        getPerpsMarketRowItemSelector.rowItem('BTC'),
      );
      expect(() => fireEvent.press(rowItem)).not.toThrow();
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
      render(<PerpsMarketRowItem market={mockMarketData} />);

      // Should have a TouchableOpacity as root with the correct testID
      const rowItem = screen.getByTestId(
        getPerpsMarketRowItemSelector.rowItem('BTC'),
      );
      expect(rowItem).toBeOnTheScreen();
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
    it('handles multiple rapid presses correctly', async () => {
      const mockOnPress = jest.fn();
      render(
        <PerpsMarketRowItem market={mockMarketData} onPress={mockOnPress} />,
      );

      const rowItem = screen.getByTestId(
        getPerpsMarketRowItemSelector.rowItem('BTC'),
      );

      fireEvent.press(rowItem);
      fireEvent.press(rowItem);
      fireEvent.press(rowItem);

      expect(mockOnPress).toHaveBeenCalledTimes(3);
      expect(mockOnPress).toHaveBeenCalledWith(mockMarketData);
    });
  });

  describe('Live Price Updates', () => {
    beforeEach(() => {
      // Default: hook returns the market unchanged (no live data)
      mockUsePerpsLiveMarket.mockImplementation((m: PerpsMarketData) => m);
    });

    it('delegates to usePerpsLiveMarket with the market prop', () => {
      render(<PerpsMarketRowItem market={mockMarketData} />);

      expect(mockUsePerpsLiveMarket).toHaveBeenCalledWith(mockMarketData);
    });

    it('renders merged market data returned by usePerpsLiveMarket', () => {
      const mergedMarket: PerpsMarketData = {
        ...mockMarketData,
        price: '$55,000',
        change24hPercent: '+5.77%',
        volume: '$3.00B',
      };
      mockUsePerpsLiveMarket.mockReturnValue(mergedMarket);

      render(<PerpsMarketRowItem market={mockMarketData} />);

      expect(screen.getByText('$55,000')).toBeOnTheScreen();
      expect(screen.getByText('$3.00B Vol')).toBeOnTheScreen();
    });

    it('keeps original data when usePerpsLiveMarket returns the original market', () => {
      mockUsePerpsLiveMarket.mockImplementation((m: PerpsMarketData) => m);

      render(<PerpsMarketRowItem market={mockMarketData} />);

      expect(screen.getByText('$52,000')).toBeOnTheScreen();
      expect(screen.getByText('+4.00%')).toBeOnTheScreen();
    });

    it('handles negative price changes correctly', () => {
      const mergedMarket: PerpsMarketData = {
        ...mockMarketData,
        price: '$48,000',
        change24h: '-$4,000',
        change24hPercent: '-7.84%',
        volume: '$2.00B',
      };
      mockUsePerpsLiveMarket.mockReturnValue(mergedMarket);

      render(<PerpsMarketRowItem market={mockMarketData} />);

      expect(screen.getByText('$48,000')).toBeOnTheScreen();
    });

    it('handles zero percent change correctly', () => {
      const mergedMarket: PerpsMarketData = {
        ...mockMarketData,
        price: '$50,000',
        change24hPercent: '0.00%',
        volume: '$1.50B',
      };
      mockUsePerpsLiveMarket.mockReturnValue(mergedMarket);

      render(<PerpsMarketRowItem market={mockMarketData} />);

      expect(screen.getByText('$50,000')).toBeOnTheScreen();
    });

    it('handles -100% change correctly', () => {
      const mergedMarket: PerpsMarketData = {
        ...mockMarketData,
        price: '$0',
        change24hPercent: '-100.00%',
        volume: '$0.00',
      };
      mockUsePerpsLiveMarket.mockReturnValue(mergedMarket);

      render(<PerpsMarketRowItem market={mockMarketData} />);

      expect(screen.getByText('$0')).toBeOnTheScreen();
      expect(screen.getByText('$0.00 Vol')).toBeOnTheScreen();
    });

    it('renders different volume ranges from merged market data', () => {
      const { rerender } = render(
        <PerpsMarketRowItem market={mockMarketData} />,
      );

      mockUsePerpsLiveMarket.mockReturnValue({
        ...mockMarketData,
        price: '$50,000',
        volume: '$5.50B',
      });
      rerender(<PerpsMarketRowItem market={{ ...mockMarketData }} />);
      expect(screen.getByText('$5.50B Vol')).toBeOnTheScreen();

      mockUsePerpsLiveMarket.mockReturnValue({
        ...mockMarketData,
        price: '$50,000',
        volume: '$750.00M',
      });
      rerender(<PerpsMarketRowItem market={{ ...mockMarketData }} />);
      expect(screen.getByText('$750.00M Vol')).toBeOnTheScreen();

      mockUsePerpsLiveMarket.mockReturnValue({
        ...mockMarketData,
        price: '$50,000',
        volume: '$50K',
      });
      rerender(<PerpsMarketRowItem market={{ ...mockMarketData }} />);
      expect(screen.getByText('$50K Vol')).toBeOnTheScreen();
    });

    it('handles missing live price fields gracefully via hook pass-through', () => {
      const mergedMarket: PerpsMarketData = {
        ...mockMarketData,
        price: '$53,000',
        // change and volume unchanged — hook kept originals
      };
      mockUsePerpsLiveMarket.mockReturnValue(mergedMarket);

      render(<PerpsMarketRowItem market={mockMarketData} />);

      expect(screen.getByText('$53,000')).toBeOnTheScreen();
      expect(screen.getByText('+4.00%')).toBeOnTheScreen();
      expect(screen.getByText('$2.5B Vol')).toBeOnTheScreen();
    });

    it('handles live prices for different symbols independently', () => {
      const ethMarket: PerpsMarketData = {
        symbol: 'ETH',
        name: 'Ethereum',
        maxLeverage: '25x',
        price: '$3,000',
        change24h: '-$50',
        change24hPercent: '-1.64%',
        volume: '$1.2B',
      };

      const mergedEthMarket: PerpsMarketData = {
        ...ethMarket,
        price: '$3,200',
      };
      mockUsePerpsLiveMarket.mockImplementation((m: PerpsMarketData) =>
        m.symbol === 'ETH' ? mergedEthMarket : m,
      );

      render(<PerpsMarketRowItem market={ethMarket} />);

      expect(mockUsePerpsLiveMarket).toHaveBeenCalledWith(ethMarket);
      expect(screen.getByText('$3,200')).toBeOnTheScreen();
    });

    it('passes merged market data returned by hook to onPress callback', async () => {
      const mockOnPress = jest.fn();
      const mergedMarket: PerpsMarketData = {
        ...mockMarketData,
        price: '$55,000',
        change24hPercent: '+5.77%',
        volume: '$3.00B',
      };
      mockUsePerpsLiveMarket.mockReturnValue(mergedMarket);

      render(
        <PerpsMarketRowItem market={mockMarketData} onPress={mockOnPress} />,
      );

      const rowItem = screen.getByTestId(
        getPerpsMarketRowItemSelector.rowItem('BTC'),
      );
      fireEvent.press(rowItem);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockOnPress.mock.calls[0][0].symbol).toBe('BTC');
      expect(mockOnPress.mock.calls[0][0].price).toBe('$55,000');
    });

    it('handles very small price values from merged market', () => {
      const mergedMarket: PerpsMarketData = {
        ...mockMarketData,
        price: '$0.000123',
        change24hPercent: '+15.50%',
        volume: '$1K',
      };
      mockUsePerpsLiveMarket.mockReturnValue(mergedMarket);

      render(<PerpsMarketRowItem market={mockMarketData} />);

      expect(screen.getByText('$0.000123')).toBeOnTheScreen();
    });

    it('handles very large price values from merged market', () => {
      const mergedMarket: PerpsMarketData = {
        ...mockMarketData,
        price: '$100,000,000',
        change24hPercent: '+2.50%',
        volume: '$10.00B',
      };
      mockUsePerpsLiveMarket.mockReturnValue(mergedMarket);

      render(<PerpsMarketRowItem market={mockMarketData} />);

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
      mockUsePerpsLiveMarket.mockImplementation((m: PerpsMarketData) => m);
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

    it('updates funding rate from live data via usePerpsLiveMarket', () => {
      const marketWithInitialFundingRate: PerpsMarketData = {
        ...mockMarketData,
        fundingRate: 0.0001,
      };
      const mergedMarket: PerpsMarketData = {
        ...marketWithInitialFundingRate,
        fundingRate: 0.0005, // Updated by hook
      };
      mockUsePerpsLiveMarket.mockReturnValue(mergedMarket);

      render(
        <PerpsMarketRowItem
          market={marketWithInitialFundingRate}
          displayMetric="fundingRate"
        />,
      );

      expect(screen.getByText('0.0500% Funding')).toBeOnTheScreen();
    });

    it('updates funding rate even when price has not changed', () => {
      const marketWithInitialFundingRate: PerpsMarketData = {
        ...mockMarketData,
        price: '$52,000',
        fundingRate: 0.0001,
      };
      const mergedMarket: PerpsMarketData = {
        ...marketWithInitialFundingRate,
        fundingRate: 0.0012, // Updated by hook
      };
      mockUsePerpsLiveMarket.mockReturnValue(mergedMarket);

      render(
        <PerpsMarketRowItem
          market={marketWithInitialFundingRate}
          displayMetric="fundingRate"
        />,
      );

      expect(screen.getByText('0.1200% Funding')).toBeOnTheScreen();
      expect(screen.getByText('$52,000')).toBeOnTheScreen();
    });

    it('does not update when funding rate has not changed', () => {
      const marketWithFundingRate: PerpsMarketData = {
        ...mockMarketData,
        price: '$52,000',
        fundingRate: 0.0005,
      };
      // Hook returns same object — no change
      mockUsePerpsLiveMarket.mockImplementation((m: PerpsMarketData) => m);

      render(
        <PerpsMarketRowItem
          market={marketWithFundingRate}
          displayMetric="fundingRate"
        />,
      );

      expect(screen.getByText('0.0500% Funding')).toBeOnTheScreen();
    });

    it('handles very small funding rates correctly', () => {
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

    it('passes updated funding rate to onPress callback', async () => {
      const mockOnPress = jest.fn();
      const marketWithInitialFundingRate: PerpsMarketData = {
        ...mockMarketData,
        fundingRate: 0.0001,
      };
      const mergedMarket: PerpsMarketData = {
        ...marketWithInitialFundingRate,
        fundingRate: 0.0005, // Updated by hook
      };
      mockUsePerpsLiveMarket.mockReturnValue(mergedMarket);

      render(
        <PerpsMarketRowItem
          market={marketWithInitialFundingRate}
          displayMetric="fundingRate"
          onPress={mockOnPress}
        />,
      );

      const rowItem = screen.getByTestId(
        getPerpsMarketRowItemSelector.rowItem('BTC'),
      );
      fireEvent.press(rowItem);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockOnPress.mock.calls[0][0].fundingRate).toBe(0.0005);
    });

    it('handles funding rate update when live data funding is undefined', () => {
      const marketWithFundingRate: PerpsMarketData = {
        ...mockMarketData,
        fundingRate: 0.0005,
      };
      // Hook returns market unchanged when no funding update
      mockUsePerpsLiveMarket.mockImplementation((m: PerpsMarketData) => m);

      render(
        <PerpsMarketRowItem
          market={marketWithFundingRate}
          displayMetric="fundingRate"
        />,
      );

      expect(screen.getByText('0.0500% Funding')).toBeOnTheScreen();
    });
  });
});
