import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsCard from './PerpsCard';
import Routes from '../../../../../constants/navigation/Routes';
import { usePerpsMarkets } from '../../hooks/usePerpsMarkets';
import {
  defaultPerpsPositionMock,
  defaultPerpsOrderMock,
} from '../../__mocks__/perpsHooksMocks';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

// Mock dependencies
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      card: {},
      cardContent: {},
      cardLeft: {},
      assetIcon: {},
      cardInfo: {},
      cardRight: {},
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../hooks/usePerpsMarkets', () => ({
  usePerpsMarkets: jest.fn(),
}));

jest.mock('../PerpsTokenLogo', () => 'PerpsTokenLogo');

describe('PerpsCard', () => {
  const mockPosition = { ...defaultPerpsPositionMock };
  const mockOrder = { ...defaultPerpsOrderMock };
  const mockUsePerpsMarkets = jest.mocked(usePerpsMarkets);

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock return value
    mockUsePerpsMarkets.mockReturnValue({
      markets: [
        {
          symbol: 'ETH',
          name: 'Ethereum',
          maxLeverage: '50',
          price: '$3,000.00',
          change24h: '+$150.00',
          change24hPercent: '+5.0%',
          volume: '$1.2B',
        },
      ],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      isRefreshing: false,
    });
  });

  describe('Navigation', () => {
    it('navigates to position tab when position card is pressed', () => {
      // Act
      const { getByTestId } = render(
        <PerpsCard position={mockPosition} testID="test-position-card" />,
      );

      const card = getByTestId('test-position-card');
      fireEvent.press(card);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: expect.objectContaining({
            symbol: 'ETH',
          }),
          initialTab: 'position',
        },
      });
    });

    it('navigates to orders tab when order card is pressed', () => {
      // Act
      const { getByTestId } = render(
        <PerpsCard order={mockOrder} testID="test-order-card" />,
      );

      const card = getByTestId('test-order-card');
      fireEvent.press(card);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: expect.objectContaining({
            symbol: 'ETH',
          }),
          initialTab: 'orders',
        },
      });
    });

    it('calls custom onPress when provided', () => {
      // Arrange
      const customOnPress = jest.fn();

      // Act
      const { getByTestId } = render(
        <PerpsCard
          position={mockPosition}
          onPress={customOnPress}
          testID="test-card"
        />,
      );

      const card = getByTestId('test-card');
      fireEvent.press(card);

      // Assert
      expect(customOnPress).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not navigate when no market data is available', () => {
      // Arrange
      mockUsePerpsMarkets.mockReturnValue({
        markets: [],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      // Act
      const { getByTestId } = render(
        <PerpsCard position={mockPosition} testID="test-card" />,
      );

      const card = getByTestId('test-card');
      fireEvent.press(card);

      // Assert
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not navigate when market symbol does not match', () => {
      // Arrange
      mockUsePerpsMarkets.mockReturnValue({
        markets: [
          {
            symbol: 'BTC', // Different symbol from position.coin (ETH)
            name: 'Bitcoin',
            maxLeverage: '25',
            price: '$50,000.00',
            change24h: '+$1,250.00',
            change24hPercent: '+2.5%',
            volume: '$2.1B',
          },
        ],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      // Act
      const { getByTestId } = render(
        <PerpsCard position={mockPosition} testID="test-card" />,
      );

      const card = getByTestId('test-card');
      fireEvent.press(card);

      // Assert
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Rendering', () => {
    it('renders position card with correct content', () => {
      // Arrange & Act
      const { getByText } = render(
        <PerpsCard position={mockPosition} testID="test-position-card" />,
      );

      // Assert
      expect(getByText('ETH 3x long')).toBeDefined();
      expect(getByText('1.5 ETH')).toBeDefined();
    });

    it('renders order card with correct content', () => {
      // Arrange & Act
      const { getByText } = render(
        <PerpsCard order={mockOrder} testID="test-order-card" />,
      );

      // Assert
      expect(getByText('ETH long')).toBeDefined();
      expect(getByText('1.0 ETH')).toBeDefined();
    });

    it('returns null when neither position nor order is provided', () => {
      // Arrange & Act
      const { queryByTestId } = render(<PerpsCard testID="test-card" />);

      // Assert
      expect(queryByTestId('test-card')).toBeNull();
    });
  });

  describe('Data Display', () => {
    it('displays correct PnL color for positive position', () => {
      // Arrange
      const positivePosition = {
        ...mockPosition,
        unrealizedPnl: '100.50',
        returnOnEquity: '0.05',
      };

      // Act
      const { getByText } = render(
        <PerpsCard position={positivePosition} testID="test-card" />,
      );

      // Assert
      expect(getByText('+$100.50 (+5.0%)')).toBeDefined();
    });

    it('displays correct PnL color for negative position', () => {
      // Arrange
      const negativePosition = {
        ...mockPosition,
        unrealizedPnl: '-50.25',
        returnOnEquity: '-0.025',
      };

      // Act
      const { getByText } = render(
        <PerpsCard position={negativePosition} testID="test-card" />,
      );

      // Assert
      expect(getByText('-$50.25 (-2.5%)')).toBeDefined();
    });

    it('displays short position correctly', () => {
      // Arrange
      const shortPosition = {
        ...mockPosition,
        size: '-1.5',
      };

      // Act
      const { getByText } = render(
        <PerpsCard position={shortPosition} testID="test-card" />,
      );

      // Assert
      expect(getByText('ETH 3x short')).toBeDefined();
      expect(getByText('1.5 ETH')).toBeDefined();
    });

    it('displays order side correctly', () => {
      // Arrange
      const sellOrder = {
        ...mockOrder,
        side: 'sell' as const,
      };

      // Act
      const { getByText } = render(
        <PerpsCard order={sellOrder} testID="test-card" />,
      );

      // Assert
      expect(getByText('ETH short')).toBeDefined();
    });
  });
});
