import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsPositionHeader from './PerpsPositionHeader';
import { usePerpsAssetMetadata } from '../../hooks/usePerpsAssetsMetadata';
import { useStyles } from '../../../../../component-library/hooks';
import type { Position, PriceUpdate } from '../../controllers/types';
import { Theme } from '../../../../../util/theme/models';
import { PerpsPositionHeaderSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

// Mock dependencies
jest.mock('../../hooks/usePerpsAssetsMetadata', () => ({
  usePerpsAssetMetadata: jest.fn(),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(),
}));

jest.mock('../../../../Base/RemoteImage', () => {
  const { Image } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      source,
      testID,
      ...props
    }: {
      source?: { uri?: string };
      testID?: string;
      [key: string]: unknown;
    }) => (
      <Image testID={testID || 'remote-image'} source={source} {...props} />
    ),
  };
});

// Mock format utilities
jest.mock('../../utils/formatUtils', () => ({
  formatPnl: (value: number) =>
    `${value >= 0 ? '+' : '-'}$${Math.abs(value).toFixed(2)}`,
  formatPercentage: (value: string | number) => `${value}%`,
  formatPrice: (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  },
}));

// Mock styles
jest.mock('./PerpsPositionHeader.styles', () => ({
  styleSheet: () => ({}),
}));

const mockUsePerpsAssetMetadata = usePerpsAssetMetadata as jest.MockedFunction<
  typeof usePerpsAssetMetadata
>;
const mockUseStyles = useStyles as jest.MockedFunction<typeof useStyles>;

describe('PerpsPositionHeader', () => {
  // Mock position data
  const mockPosition: Position = {
    coin: 'ETH',
    size: '2.5',
    entryPrice: '2000.00',
    positionValue: '5000.00',
    unrealizedPnl: '250.00',
    marginUsed: '1000.00',
    leverage: {
      type: 'isolated',
      value: 5,
    },
    liquidationPrice: '1500.00',
    maxLeverage: 100,
    returnOnEquity: '5.0',
    cumulativeFunding: {
      allTime: '10.00',
      sinceOpen: '5.00',
      sinceChange: '2.00',
    },
  };

  const mockPriceData: PriceUpdate = {
    coin: 'ETH',
    price: '2100.00',
    timestamp: Date.now(),
    percentChange24h: '5.0',
  };

  const mockStyles = {
    container: { flexDirection: 'row' },
    backButton: { marginRight: 8 },
    perpIcon: { marginRight: 16 },
    tokenIcon: { width: 32, height: 32 },
    leftSection: { flex: 1 },
    assetName: { fontWeight: 'bold' },
    positionValueRow: { flexDirection: 'row', alignItems: 'center' },
    positionValue: { marginRight: 8 },
    priceChange24h: { marginLeft: 8 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStyles.mockReturnValue({ styles: mockStyles, theme: {} as Theme });
    mockUsePerpsAssetMetadata.mockReturnValue({
      assetUrl: '',
      error: null,
      hasError: false,
    });
  });

  describe('Component Rendering', () => {
    it('renders position header with all required elements', () => {
      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          priceData={mockPriceData}
        />,
      );

      // Assert
      expect(screen.getByText('ETH-USD')).toBeOnTheScreen();
      expect(screen.getByText('$2,100.00')).toBeOnTheScreen();
      expect(screen.getByText('+$262.50 (5.0%)')).toBeOnTheScreen();
    });

    it('renders back button when onBackPress is provided', () => {
      // Arrange
      const mockOnBackPress = jest.fn();

      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          priceData={mockPriceData}
          onBackPress={mockOnBackPress}
        />,
      );

      // Assert
      expect(
        screen.getByTestId(PerpsPositionHeaderSelectorsIDs.BACK_BUTTON),
      ).toBeOnTheScreen();
    });

    it('does not render back button when onBackPress is not provided', () => {
      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          priceData={mockPriceData}
        />,
      );

      // Assert
      expect(
        screen.queryByTestId(PerpsPositionHeaderSelectorsIDs.BACK_BUTTON),
      ).toBeNull();
    });

    it('renders fallback icon when assetUrl is not available', () => {
      // Arrange
      mockUsePerpsAssetMetadata.mockReturnValue({
        assetUrl: '',
        error: null,
        hasError: false,
      });

      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          priceData={mockPriceData}
        />,
      );

      // Assert
      expect(screen.queryByTestId('remote-image')).toBeNull();
      // Icon should be rendered - we can verify by checking that remote-image is not present
      // since the component logic shows either Icon or RemoteImage
    });

    it('renders asset image when assetUrl is available', () => {
      // Arrange
      const assetUrl = 'https://example.com/eth.png';
      mockUsePerpsAssetMetadata.mockReturnValue({
        assetUrl,
        error: null,
        hasError: false,
      });

      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          priceData={mockPriceData}
        />,
      );

      // Assert
      expect(screen.getByTestId('remote-image')).toBeOnTheScreen();
      // When remote-image is present, Icon should not be rendered
    });
  });

  describe('Price Data Display', () => {
    it('displays current market price when priceData is provided', () => {
      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          priceData={mockPriceData}
        />,
      );

      // Assert
      expect(screen.getByText('$2,100.00')).toBeOnTheScreen();
    });

    it('displays skeleton when priceData is not provided', () => {
      // Act
      render(<PerpsPositionHeader position={mockPosition} />);

      // Assert
      // When priceData is not provided, actual price should not be displayed
      expect(screen.queryByText('$2,100.00')).toBeNull();
    });

    it('displays skeleton when priceData price is missing', () => {
      // Arrange
      const priceDataWithoutPrice = {
        ...mockPriceData,
        price: undefined as unknown as string,
      };

      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          priceData={priceDataWithoutPrice}
        />,
      );

      // Assert
      // When price is missing, actual price should not be displayed
      expect(screen.queryByText(/^\$\d+\.\d+$/)).toBeNull();
    });
  });

  describe('24-Hour Price Change', () => {
    it('displays positive 24h price change with success color', () => {
      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          priceData={mockPriceData}
        />,
      );

      // Assert
      const priceChangeText = screen.getByText('+$262.50 (5.0%)');
      expect(priceChangeText).toBeOnTheScreen();
    });

    it('displays negative 24h price change with error color', () => {
      // Arrange
      const negativePriceData = {
        ...mockPriceData,
        percentChange24h: '-3.5',
      };

      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          priceData={negativePriceData}
        />,
      );

      // Assert
      const priceChangeText = screen.getByText('-$183.75 (-3.5%)');
      expect(priceChangeText).toBeOnTheScreen();
    });

    it('does not display 24h price change when percentChange24h is missing', () => {
      // Arrange
      const priceDataWithoutChange = {
        ...mockPriceData,
        percentChange24h: undefined,
      };

      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          priceData={priceDataWithoutChange}
        />,
      );

      // Assert
      expect(screen.queryByText(/\(/)).toBeNull(); // No parentheses indicating percentage
    });

    it('does not display 24h price change when price is missing', () => {
      // Arrange
      const priceDataWithoutPrice = {
        ...mockPriceData,
        price: undefined as unknown as string,
      };

      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          priceData={priceDataWithoutPrice}
        />,
      );

      // Assert
      expect(screen.queryByText(/\(/)).toBeNull(); // No parentheses indicating percentage
    });
  });

  describe('Currency Formatting', () => {
    it('formats large price values with commas', () => {
      // Arrange
      const largePriceData = {
        ...mockPriceData,
        price: '12345.67',
      };

      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          priceData={largePriceData}
        />,
      );

      // Assert
      expect(screen.getByText('$12,345.67')).toBeOnTheScreen();
    });

    it('formats small price values correctly', () => {
      // Arrange
      const smallPriceData = {
        ...mockPriceData,
        price: '0.01',
      };

      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          priceData={smallPriceData}
        />,
      );

      // Assert
      expect(screen.getByText('$0.01')).toBeOnTheScreen();
    });

    it('formats zero price values correctly', () => {
      // Arrange
      const zeroPriceData = {
        ...mockPriceData,
        price: '0.00',
      };

      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          priceData={zeroPriceData}
        />,
      );

      // Assert
      expect(screen.getByText('$0.00')).toBeOnTheScreen();
    });
  });

  describe('Asset Display', () => {
    it('displays different asset symbols correctly', () => {
      // Arrange
      const btcPosition = {
        ...mockPosition,
        coin: 'BTC',
      };

      // Act
      render(
        <PerpsPositionHeader
          position={btcPosition}
          priceData={mockPriceData}
        />,
      );

      // Assert
      expect(screen.getByText('BTC-USD')).toBeOnTheScreen();
      expect(mockUsePerpsAssetMetadata).toHaveBeenCalledWith('BTC');
    });

    it('calls usePerpsAssetMetadata with correct asset symbol', () => {
      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          priceData={mockPriceData}
        />,
      );

      // Assert
      expect(mockUsePerpsAssetMetadata).toHaveBeenCalledWith('ETH');
    });
  });

  describe('User Interactions', () => {
    it('calls onBackPress when back button is pressed', () => {
      // Arrange
      const mockOnBackPress = jest.fn();

      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          priceData={mockPriceData}
          onBackPress={mockOnBackPress}
        />,
      );

      fireEvent.press(
        screen.getByTestId(PerpsPositionHeaderSelectorsIDs.BACK_BUTTON),
      );

      // Assert
      expect(mockOnBackPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined or null assetUrl gracefully', () => {
      // Arrange
      mockUsePerpsAssetMetadata.mockReturnValue({
        assetUrl: undefined as unknown as string,
        error: null,
        hasError: false,
      });

      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          priceData={mockPriceData}
        />,
      );

      // Assert
      // Should render without crashing and display the asset name
      expect(screen.getByText('ETH-USD')).toBeOnTheScreen();
    });

    it('handles very long asset names', () => {
      // Arrange
      const longNamePosition = {
        ...mockPosition,
        coin: 'VERYLONGASSETNAMETOKEN',
      };

      // Act
      render(
        <PerpsPositionHeader
          position={longNamePosition}
          priceData={mockPriceData}
        />,
      );

      // Assert
      expect(screen.getByText('VERYLONGASSETNAMETOKEN-USD')).toBeOnTheScreen();
    });

    it('handles extreme price values', () => {
      // Arrange
      const extremePriceData = {
        ...mockPriceData,
        price: '999999.99',
      };

      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          priceData={extremePriceData}
        />,
      );

      // Assert
      expect(screen.getByText('$999,999.99')).toBeOnTheScreen();
    });

    it('handles position with zero size', () => {
      // Arrange
      const zeroSizePosition = {
        ...mockPosition,
        size: '0',
      };

      // Act
      render(
        <PerpsPositionHeader
          position={zeroSizePosition}
          priceData={mockPriceData}
        />,
      );

      // Assert
      // When position size is 0, no 24h price change should be displayed
      expect(screen.getByText('ETH-USD')).toBeOnTheScreen();
      expect(screen.getByText('$2,100.00')).toBeOnTheScreen();
      expect(screen.queryByText(/\(/)).toBeNull(); // No parentheses indicating no percentage display
    });
  });

  describe('Component Integration', () => {
    it('uses styles from useStyles hook', () => {
      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          priceData={mockPriceData}
        />,
      );

      // Assert
      expect(mockUseStyles).toHaveBeenCalledWith(expect.anything(), {});
    });

    it('renders with proper component structure', () => {
      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          priceData={mockPriceData}
        />,
      );

      // Assert - Check that all expected text elements are rendered
      expect(screen.getByText('ETH-USD')).toBeOnTheScreen();
      expect(screen.getByText('$2,100.00')).toBeOnTheScreen();
      expect(screen.getByText('+$262.50 (5.0%)')).toBeOnTheScreen();
    });
  });
});
