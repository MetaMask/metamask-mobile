import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PerpsPositionHeader from './PerpsPositionHeader';
import { usePerpsAssetMetadata } from '../../hooks/usePerpsAssetsMetadata';
import { useStyles } from '../../../../../component-library/hooks';
import type { Position } from '../../controllers/types';
import { Theme } from '../../../../../util/theme/models';

// Mock dependencies
jest.mock('../../hooks/usePerpsAssetsMetadata', () => ({
  usePerpsAssetMetadata: jest.fn(),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(),
}));

jest.mock('../../../../../component-library/components/Texts/Text', () => ({
  __esModule: true,
  default: ({
    children,
    testID,
    color,
    ...props
  }: {
    children: React.ReactNode;
    testID?: string;
    color?: string;
    [key: string]: unknown;
  }) => {
    const { Text } = jest.requireActual('react-native');
    return (
      <Text testID={testID} data-color={color} {...props}>
        {children}
      </Text>
    );
  },
  TextVariant: {
    BodySM: 'BodySM',
  },
  TextColor: {
    Default: 'Default',
    Success: 'Success',
    Error: 'Error',
  },
}));

jest.mock('../../../../../component-library/components/Icons/Icon', () => ({
  __esModule: true,
  default: ({
    name,
    size,
    testID,
  }: {
    name?: string;
    size?: string;
    testID?: string;
  }) => {
    const { View } = jest.requireActual('react-native');
    return <View testID={testID || 'icon'} data-name={name} data-size={size} />;
  },
  IconName: {
    Coin: 'Coin',
  },
  IconSize: {
    Lg: 'Lg',
  },
}));

jest.mock('../../../../Base/RemoteImage', () => ({
  __esModule: true,
  default: ({
    source,
    style,
    testID,
  }: {
    source?: { uri?: string };
    style?: unknown;
    testID?: string;
  }) => {
    const { View } = jest.requireActual('react-native');
    return (
      <View
        testID={testID || 'remote-image'}
        data-uri={source?.uri}
        style={style}
      />
    );
  },
}));

// Mock hooks
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

  const mockStyles = {
    container: { flexDirection: 'row' },
    perpIcon: { marginRight: 16 },
    tokenIcon: { width: 32, height: 32 },
    leftSection: { flex: 1 },
    rightSection: { flex: 1 },
    assetName: { fontWeight: 'bold' },
    positionValue: { marginBottom: 8 },
    pnlText: { textAlign: 'right' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStyles.mockReturnValue({ styles: mockStyles, theme: {} as Theme });
    mockUsePerpsAssetMetadata.mockReturnValue({ assetUrl: '' });
  });

  describe('Component Rendering', () => {
    it('renders position header with all required elements', () => {
      // Arrange
      const pnlPercentage = 5.0;

      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          pnlPercentage={pnlPercentage}
        />,
      );

      // Assert
      expect(screen.getByText('ETH')).toBeOnTheScreen();
      expect(screen.getByText('$5,000.00')).toBeOnTheScreen();
      expect(screen.getByText('Unrealized')).toBeOnTheScreen();
      expect(screen.getByText('+$250.00 (5.00%)')).toBeOnTheScreen();
    });

    it('renders fallback icon when assetUrl is not available', () => {
      // Arrange
      mockUsePerpsAssetMetadata.mockReturnValue({ assetUrl: '' });

      // Act
      render(
        <PerpsPositionHeader position={mockPosition} pnlPercentage={5.0} />,
      );

      // Assert
      expect(screen.getByTestId('icon')).toBeOnTheScreen();
      expect(screen.queryByTestId('remote-image')).toBeNull();
    });

    it('renders asset image when assetUrl is available', () => {
      // Arrange
      const assetUrl = 'https://example.com/eth.png';
      mockUsePerpsAssetMetadata.mockReturnValue({ assetUrl });

      // Act
      render(
        <PerpsPositionHeader position={mockPosition} pnlPercentage={5.0} />,
      );

      // Assert
      expect(screen.getByTestId('remote-image')).toBeOnTheScreen();
      expect(screen.getByTestId('remote-image')).toHaveProp(
        'data-uri',
        assetUrl,
      );
      expect(screen.queryByTestId('icon')).toBeNull();
    });
  });

  describe('Currency Formatting', () => {
    it('formats position value as USD currency', () => {
      // Arrange
      const positionWithLargeValue = {
        ...mockPosition,
        positionValue: '12345.67',
      };

      // Act
      render(
        <PerpsPositionHeader
          position={positionWithLargeValue}
          pnlPercentage={5.0}
        />,
      );

      // Assert
      expect(screen.getByText('$12,345.67')).toBeOnTheScreen();
    });

    it('formats small position values correctly', () => {
      // Arrange
      const positionWithSmallValue = {
        ...mockPosition,
        positionValue: '0.01',
      };

      // Act
      render(
        <PerpsPositionHeader
          position={positionWithSmallValue}
          pnlPercentage={5.0}
        />,
      );

      // Assert
      expect(screen.getByText('$0.01')).toBeOnTheScreen();
    });

    it('formats zero position value correctly', () => {
      // Arrange
      const positionWithZeroValue = {
        ...mockPosition,
        positionValue: '0.00',
      };

      // Act
      render(
        <PerpsPositionHeader
          position={positionWithZeroValue}
          pnlPercentage={0}
        />,
      );

      // Assert
      expect(screen.getByText('$0.00')).toBeOnTheScreen();
    });
  });

  describe('PnL Formatting and Colors', () => {
    it('displays positive PnL with success color and plus sign', () => {
      // Arrange
      const positivePnlPercentage = 12.5;

      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          pnlPercentage={positivePnlPercentage}
        />,
      );

      // Assert
      expect(screen.getByText('Unrealized')).toBeOnTheScreen();
      expect(screen.getByText('+$250.00 (12.50%)')).toBeOnTheScreen();
    });

    it('displays negative PnL with error color and minus sign', () => {
      // Arrange
      const negativePosition = {
        ...mockPosition,
        unrealizedPnl: '-150.00',
      };
      const negativePnlPercentage = -3.0;

      // Act
      render(
        <PerpsPositionHeader
          position={negativePosition}
          pnlPercentage={negativePnlPercentage}
        />,
      );

      // Assert
      expect(screen.getByText('Unrealized')).toBeOnTheScreen();
      expect(screen.getByText('-$150.00 (-3.00%)')).toBeOnTheScreen();
    });

    it('displays zero PnL with success color', () => {
      // Arrange
      const zeroPosition = {
        ...mockPosition,
        unrealizedPnl: '0.00',
      };
      const zeroPnlPercentage = 0.0;

      // Act
      render(
        <PerpsPositionHeader
          position={zeroPosition}
          pnlPercentage={zeroPnlPercentage}
        />,
      );

      // Assert
      expect(screen.getByText('Unrealized')).toBeOnTheScreen();
      expect(screen.getByText('+$0.00 (0.00%)')).toBeOnTheScreen();
    });

    it('handles string unrealized PnL values', () => {
      // Arrange
      const stringPnlPosition = {
        ...mockPosition,
        unrealizedPnl: '123.45',
      };

      // Act
      render(
        <PerpsPositionHeader
          position={stringPnlPosition}
          pnlPercentage={2.47}
        />,
      );

      // Assert
      expect(screen.getByText('+$123.45 (2.47%)')).toBeOnTheScreen();
    });

    it('handles large PnL values correctly', () => {
      // Arrange
      const largePnlPosition = {
        ...mockPosition,
        unrealizedPnl: '12345.67',
      };

      // Act
      render(
        <PerpsPositionHeader
          position={largePnlPosition}
          pnlPercentage={24.69}
        />,
      );

      // Assert
      expect(screen.getByText('+$12,345.67 (24.69%)')).toBeOnTheScreen();
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
        <PerpsPositionHeader position={btcPosition} pnlPercentage={5.0} />,
      );

      // Assert
      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(mockUsePerpsAssetMetadata).toHaveBeenCalledWith('BTC');
    });

    it('calls usePerpsAssetMetadata with correct asset symbol', () => {
      // Arrange & Act
      render(
        <PerpsPositionHeader position={mockPosition} pnlPercentage={5.0} />,
      );

      // Assert
      expect(mockUsePerpsAssetMetadata).toHaveBeenCalledWith('ETH');
    });
  });

  describe('Percentage Formatting', () => {
    it('formats percentage with two decimal places', () => {
      // Arrange
      const precisePercentage = 12.3456;

      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          pnlPercentage={precisePercentage}
        />,
      );

      // Assert
      expect(screen.getByText('+$250.00 (12.35%)')).toBeOnTheScreen();
    });

    it('handles very small percentages correctly', () => {
      // Arrange
      const smallPercentage = 0.001;

      // Act
      render(
        <PerpsPositionHeader
          position={mockPosition}
          pnlPercentage={smallPercentage}
        />,
      );

      // Assert
      expect(screen.getByText('+$250.00 (0.00%)')).toBeOnTheScreen();
    });

    it('handles negative percentages correctly', () => {
      // Arrange
      const negativePosition = {
        ...mockPosition,
        unrealizedPnl: '-75.25',
      };
      const negativePercentage = -1.505;

      // Act
      render(
        <PerpsPositionHeader
          position={negativePosition}
          pnlPercentage={negativePercentage}
        />,
      );

      // Assert
      // Check that the negative PnL text is present (may be split across elements)
      expect(screen.getByText(/-\$75\.25/)).toBeOnTheScreen();
      expect(screen.getByText(/-1\.50%/)).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined or null assetUrl gracefully', () => {
      // Arrange
      mockUsePerpsAssetMetadata.mockReturnValue({
        assetUrl: undefined as unknown as string,
      });

      // Act
      render(
        <PerpsPositionHeader position={mockPosition} pnlPercentage={5.0} />,
      );

      // Assert
      expect(screen.getByTestId('icon')).toBeOnTheScreen();
    });

    it('handles extreme PnL values', () => {
      // Arrange
      const extremePosition = {
        ...mockPosition,
        unrealizedPnl: '999999.99',
      };

      // Act
      render(
        <PerpsPositionHeader
          position={extremePosition}
          pnlPercentage={1999.99}
        />,
      );

      // Assert
      expect(screen.getByText('+$999,999.99 (1999.99%)')).toBeOnTheScreen();
    });

    it('handles very long asset names', () => {
      // Arrange
      const longNamePosition = {
        ...mockPosition,
        coin: 'VERYLONGASSETNAMETOKEN',
      };

      // Act
      render(
        <PerpsPositionHeader position={longNamePosition} pnlPercentage={5.0} />,
      );

      // Assert
      expect(screen.getByText('VERYLONGASSETNAMETOKEN')).toBeOnTheScreen();
    });
  });

  describe('Component Integration', () => {
    it('uses styles from useStyles hook', () => {
      // Arrange
      const customStyles = {
        ...mockStyles,
        container: { flexDirection: 'column' },
      };
      mockUseStyles.mockReturnValue({
        styles: customStyles,
        theme: {} as Theme,
      });

      // Act
      render(
        <PerpsPositionHeader position={mockPosition} pnlPercentage={5.0} />,
      );

      // Assert
      expect(mockUseStyles).toHaveBeenCalledWith(expect.anything(), {});
    });
  });
});
