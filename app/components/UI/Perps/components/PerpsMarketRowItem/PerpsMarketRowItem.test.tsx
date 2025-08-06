import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsMarketRowItem from './PerpsMarketRowItem';
import type { PerpsMarketData } from '../../controllers/types';
import { usePerpsAssetMetadata } from '../../hooks/usePerpsAssetsMetadata';

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

jest.mock('../../hooks/usePerpsAssetsMetadata', () => ({
  usePerpsAssetMetadata: jest.fn(),
}));
const mockUsePerpsAssetMetadata = usePerpsAssetMetadata as jest.MockedFunction<
  typeof usePerpsAssetMetadata
>;

jest.mock('../../../../Base/RemoteImage', () => {
  const { View } = jest.requireActual('react-native');
  return function MockRemoteImage({ source }: { source: { uri: string } }) {
    return <View testID="remote-image" data-uri={source.uri} />;
  };
});

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
    mockUsePerpsAssetMetadata.mockReturnValue({
      assetUrl: '',
      error: null,
      hasError: false,
    });
  });

  describe('Component Rendering', () => {
    it('renders all market data correctly', () => {
      render(<PerpsMarketRowItem market={mockMarketData} />);

      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.getByText('50x')).toBeOnTheScreen();
      expect(screen.getByText('$52,000.00')).toBeOnTheScreen();
      expect(screen.getByText('+$2,000.00 (+4.00%)')).toBeOnTheScreen();
      expect(screen.getByText('$2.5B')).toBeOnTheScreen();
    });

    it('renders as a touchable component', () => {
      render(<PerpsMarketRowItem market={mockMarketData} />);

      const touchableElements = screen.root.findAllByType(TouchableOpacity);
      expect(touchableElements).toHaveLength(1);
    });
  });

  describe('Asset Image Handling', () => {
    it('renders RemoteImage when assetUrl is available', () => {
      mockUsePerpsAssetMetadata.mockReturnValue({
        assetUrl: 'https://example.com/btc.png',
        error: null,
        hasError: false,
      });

      render(<PerpsMarketRowItem market={mockMarketData} />);

      const remoteImage = screen.getByTestId('remote-image');
      expect(remoteImage).toBeOnTheScreen();
      expect(remoteImage.props['data-uri']).toBe('https://example.com/btc.png');
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
      expect(screen.getByTestId('perps-market-row-item-ETH')).toBeOnTheScreen();
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

      expect(screen.getByText('+$25,000.00 (+85.50%)')).toBeOnTheScreen();
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
        screen.getByTestId('perps-market-row-item-VERYLONGSYMBOLNAME'),
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
      expect(screen.getByText('+$1,000.00 (+2.50%)')).toBeOnTheScreen();
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

      const avatar = screen.getByTestId('perps-market-row-item-ETH');
      expect(avatar).toBeOnTheScreen();
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

  describe('Asset Metadata Integration', () => {
    it('calls usePerpsAssetMetadata with correct symbol', () => {
      const customMarket = {
        ...mockMarketData,
        symbol: 'ETH',
      };

      render(<PerpsMarketRowItem market={customMarket} />);

      expect(mockUsePerpsAssetMetadata).toHaveBeenCalledWith('ETH');
    });

    it('handles different asset URLs correctly', () => {
      mockUsePerpsAssetMetadata.mockReturnValue({
        assetUrl: 'https://assets.metamask.io/eth.svg',
        error: null,
        hasError: false,
      });

      render(<PerpsMarketRowItem market={mockMarketData} />);

      const remoteImage = screen.getByTestId('remote-image');
      expect(remoteImage.props['data-uri']).toBe(
        'https://assets.metamask.io/eth.svg',
      );
    });
  });
});
