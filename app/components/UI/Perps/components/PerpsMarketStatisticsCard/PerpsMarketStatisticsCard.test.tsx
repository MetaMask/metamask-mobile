import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsMarketStatisticsCard from './PerpsMarketStatisticsCard';
import type { PerpsMarketStatisticsCardProps } from './PerpsMarketStatisticsCard.types';
import { FUNDING_RATE_CONFIG } from '../../constants/perpsConfig';

// Navigation mock functions
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      canGoBack: mockCanGoBack,
      setOptions: jest.fn(),
    }),
  };
});

// Mock the strings function
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock the useStyles hook
jest.mock('../../../../hooks/useStyles', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      statisticsGrid: { gap: 12 },
      statisticsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
      },
      statisticsItem: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        padding: 16,
        borderRadius: 8,
      },
      statisticsLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
      },
      statisticsValue: { fontSize: 16, fontWeight: '600' },
      fundingRateContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
      },
      fundingCountdown: { marginLeft: 2 },
    },
  })),
}));

// Mock the usePerpsLivePrices hook
const mockUsePerpsLivePrices = jest.fn(() => ({}));
jest.mock('../../hooks/stream', () => ({
  usePerpsLivePrices: () => mockUsePerpsLivePrices(),
}));

describe('PerpsMarketStatisticsCard', () => {
  const mockMarketStats = {
    high24h: '$50,000.00',
    low24h: '$45,000.00',
    volume24h: '$1,234,567.89',
    openInterest: '$987,654.32',
    fundingRate: '0.0125%',
    currentPrice: 47500,
    priceChange24h: 0.05,
    isLoading: false,
    refresh: jest.fn(),
  };

  const mockOnTooltipPress = jest.fn();

  const defaultProps: PerpsMarketStatisticsCardProps = {
    symbol: 'BTC',
    marketStats: mockMarketStats,
    onTooltipPress: mockOnTooltipPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsLivePrices.mockReturnValue({});
  });

  it('renders all statistics rows correctly', () => {
    const { getByText } = render(
      <PerpsMarketStatisticsCard {...defaultProps} />,
    );

    // Check stats title
    expect(getByText('perps.market.stats')).toBeOnTheScreen();

    // Check volume and open interest row
    expect(getByText('perps.market.24h_volume')).toBeOnTheScreen();
    expect(getByText('perps.market.open_interest')).toBeOnTheScreen();
    expect(getByText('$1,234,567.89')).toBeOnTheScreen();
    expect(getByText('$987,654.32')).toBeOnTheScreen();

    // Check funding rate row
    expect(getByText('perps.market.funding_rate')).toBeOnTheScreen();
    expect(getByText('0.0125%')).toBeOnTheScreen();

    // Check oracle price label
    expect(getByText('perps.market.oracle_price')).toBeOnTheScreen();
  });

  it('displays positive funding rate in success color', () => {
    const positiveFundingStats = {
      ...mockMarketStats,
      fundingRate: '0.0250%',
    };

    const { getByText } = render(
      <PerpsMarketStatisticsCard
        {...defaultProps}
        marketStats={positiveFundingStats}
      />,
    );

    const fundingRateText = getByText('0.0250%');
    expect(fundingRateText).toBeOnTheScreen();
  });

  it('displays negative funding rate in error color', () => {
    const negativeFundingStats = {
      ...mockMarketStats,
      fundingRate: '-0.0150%',
    };

    const { getByText } = render(
      <PerpsMarketStatisticsCard
        {...defaultProps}
        marketStats={negativeFundingStats}
      />,
    );

    const fundingRateText = getByText('-0.0150%');
    expect(fundingRateText).toBeOnTheScreen();
  });

  it('displays zero funding rate in default color', () => {
    const zeroFundingStats = {
      ...mockMarketStats,
      fundingRate: FUNDING_RATE_CONFIG.ZERO_DISPLAY,
    };

    const { getByText } = render(
      <PerpsMarketStatisticsCard
        {...defaultProps}
        marketStats={zeroFundingStats}
      />,
    );

    const fundingRateText = getByText(FUNDING_RATE_CONFIG.ZERO_DISPLAY);
    expect(fundingRateText).toBeOnTheScreen();
  });

  it('calls onTooltipPress with open_interest when info icon is pressed', () => {
    const { getByTestId } = render(
      <PerpsMarketStatisticsCard {...defaultProps} />,
    );

    const openInterestInfoIcon = getByTestId(
      'perps-market-details-open-interest-info-icon',
    );
    fireEvent.press(openInterestInfoIcon);

    expect(mockOnTooltipPress).toHaveBeenCalledWith('open_interest');
  });

  it('calls onTooltipPress with funding_rate when info icon is pressed', () => {
    const { getByTestId } = render(
      <PerpsMarketStatisticsCard {...defaultProps} />,
    );

    const fundingRateInfoIcon = getByTestId(
      'perps-market-details-funding-rate-info-icon',
    );
    fireEvent.press(fundingRateInfoIcon);

    expect(mockOnTooltipPress).toHaveBeenCalledWith('funding_rate');
  });

  it('handles edge case with very small funding rate values', () => {
    const smallFundingStats = {
      ...mockMarketStats,
      fundingRate: '0.0001%',
    };

    const { getByText } = render(
      <PerpsMarketStatisticsCard
        {...defaultProps}
        marketStats={smallFundingStats}
      />,
    );

    expect(getByText('0.0001%')).toBeOnTheScreen();
  });

  it('handles edge case with very large funding rate values', () => {
    const largeFundingStats = {
      ...mockMarketStats,
      fundingRate: '15.7500%',
    };

    const { getByText } = render(
      <PerpsMarketStatisticsCard
        {...defaultProps}
        marketStats={largeFundingStats}
      />,
    );

    expect(getByText('15.7500%')).toBeOnTheScreen();
  });

  it('displays all market statistics with proper formatting', () => {
    const { getByText } = render(
      <PerpsMarketStatisticsCard {...defaultProps} />,
    );

    // Verify all values are displayed (component now shows volume, open interest, funding rate, oracle price)
    expect(getByText('$1,234,567.89')).toBeOnTheScreen(); // volume24h
    expect(getByText('$987,654.32')).toBeOnTheScreen(); // openInterest
    expect(getByText('0.0125%')).toBeOnTheScreen(); // fundingRate
  });

  it('calls onTooltipPress only when info icons are pressed', () => {
    const { getByTestId } = render(
      <PerpsMarketStatisticsCard {...defaultProps} />,
    );

    // Initially no calls
    expect(mockOnTooltipPress).not.toHaveBeenCalled();

    // Press open interest info icon
    const openInterestInfoIcon = getByTestId(
      'perps-market-details-open-interest-info-icon',
    );
    fireEvent.press(openInterestInfoIcon);
    expect(mockOnTooltipPress).toHaveBeenCalledWith('open_interest');

    // Press funding rate info icon
    const fundingRateInfoIcon = getByTestId(
      'perps-market-details-funding-rate-info-icon',
    );
    fireEvent.press(fundingRateInfoIcon);
    expect(mockOnTooltipPress).toHaveBeenCalledWith('funding_rate');

    // Verify total calls
    expect(mockOnTooltipPress).toHaveBeenCalledTimes(2);
  });

  describe('Live funding rate from WebSocket', () => {
    it('displays live funding rate when available from WebSocket', () => {
      // Mock live funding rate from WebSocket
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          funding: 0.0005, // 0.05% when multiplied by 100
        },
      });

      const { getByText } = render(
        <PerpsMarketStatisticsCard {...defaultProps} />,
      );

      // Should display the live funding rate formatted to 4 decimal places
      expect(getByText('0.0500%')).toBeOnTheScreen();
    });

    it('displays negative live funding rate correctly', () => {
      // Mock negative live funding rate from WebSocket
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          funding: -0.0023, // -0.23% when multiplied by 100
        },
      });

      const { getByText } = render(
        <PerpsMarketStatisticsCard {...defaultProps} />,
      );

      // Should display the negative live funding rate
      expect(getByText('-0.2300%')).toBeOnTheScreen();
    });

    it('falls back to marketStats funding rate when live data is undefined', () => {
      // Mock no live funding data (undefined)
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          // funding is undefined
        },
      });

      const { getByText } = render(
        <PerpsMarketStatisticsCard {...defaultProps} />,
      );

      // Should fall back to the marketStats funding rate
      expect(getByText('0.0125%')).toBeOnTheScreen();
    });

    it('uses marketStats when empty symbol provided', () => {
      // Test with empty symbol
      const propsWithEmptySymbol = {
        ...defaultProps,
        symbol: '',
      };

      const { getByText } = render(
        <PerpsMarketStatisticsCard {...propsWithEmptySymbol} />,
      );

      // Should use marketStats funding rate
      expect(getByText('0.0125%')).toBeOnTheScreen();
    });

    it('displays zero funding rate when live data is zero', () => {
      // Mock zero funding rate from WebSocket
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          funding: 0,
        },
      });

      const { getByText } = render(
        <PerpsMarketStatisticsCard {...defaultProps} />,
      );

      // Should display zero funding rate
      expect(getByText(FUNDING_RATE_CONFIG.ZERO_DISPLAY)).toBeOnTheScreen();
    });
  });
});
