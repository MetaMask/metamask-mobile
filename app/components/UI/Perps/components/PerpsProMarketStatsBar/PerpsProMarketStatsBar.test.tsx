import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsProMarketStatsBar from './PerpsProMarketStatsBar';
import type { PerpsProMarketStatsBarProps } from './PerpsProMarketStatsBar.types';
import { FUNDING_RATE_CONFIG } from '../../constants/perpsConfig';
import { PerpsProMarketViewSelectorsIDs } from '../../Perps.testIds';

// Mock the strings function to echo keys back for assertions.
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock useStyles (following PerpsMarketStatisticsCard.test.tsx's pattern).
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      scrollContent: { alignItems: 'flex-start' },
      item: { minWidth: 88 },
      fundingValue: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    },
  })),
}));

// Mock the market stats hook so we control the rendered values.
const mockMarketStats = {
  high24h: '$50,000.00',
  low24h: '$45,000.00',
  volume24h: '$1,234,567.89',
  openInterest: '$987,654.32',
  fundingRate: '0.0125%',
  currentPrice: 47500,
  isLoading: false,
  refresh: jest.fn(),
};
const mockUsePerpsMarketStats = jest.fn((_symbol?: string) => mockMarketStats);
jest.mock('../../hooks/usePerpsMarketStats', () => ({
  usePerpsMarketStats: (symbol: string) => mockUsePerpsMarketStats(symbol),
}));

// Mock the live prices hook (funding rate WebSocket source).
const mockUsePerpsLivePrices = jest.fn(() => ({}));
jest.mock('../../hooks/stream', () => ({
  usePerpsLivePrices: () => mockUsePerpsLivePrices(),
}));

describe('PerpsProMarketStatsBar', () => {
  const defaultProps: PerpsProMarketStatsBarProps = {
    symbol: 'BTC',
  };

  const renderComponent = (props: Partial<PerpsProMarketStatsBarProps> = {}) =>
    render(<PerpsProMarketStatsBar {...defaultProps} {...props} />);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsMarketStats.mockReturnValue(mockMarketStats);
    mockUsePerpsLivePrices.mockReturnValue({});
  });

  it('renders the stats bar container and horizontal scroll region', () => {
    const { getByTestId } = renderComponent();

    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.STATS_BAR),
    ).toBeOnTheScreen();
    const scroll = getByTestId(PerpsProMarketViewSelectorsIDs.STATS_BAR_SCROLL);
    expect(scroll).toBeOnTheScreen();
    // The stats row must scroll horizontally rather than wrap vertically.
    expect(scroll).toHaveProp('horizontal', true);
  });

  it('renders every stat item label and value from the stats hook', () => {
    const { getByText } = renderComponent();

    expect(getByText('perps.market.funding_rate')).toBeOnTheScreen();
    expect(getByText('perps.market.24h_volume')).toBeOnTheScreen();
    expect(getByText('perps.market.open_interest')).toBeOnTheScreen();
    expect(getByText('perps.market.24h_high')).toBeOnTheScreen();
    expect(getByText('perps.market.24h_low')).toBeOnTheScreen();

    expect(getByText('$1,234,567.89')).toBeOnTheScreen();
    expect(getByText('$987,654.32')).toBeOnTheScreen();
    expect(getByText('$50,000.00')).toBeOnTheScreen();
    expect(getByText('$45,000.00')).toBeOnTheScreen();
    expect(getByText('0.0125%')).toBeOnTheScreen();
  });

  it('subscribes to live stats using the provided symbol', () => {
    renderComponent({ symbol: 'ETH' });

    expect(mockUsePerpsMarketStats).toHaveBeenCalledWith('ETH');
  });

  it('renders the funding countdown alongside the funding rate', () => {
    const { getByTestId } = renderComponent({
      nextFundingTime: Date.now() + 60 * 60 * 1000,
      fundingIntervalHours: 1,
    });

    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.STATS_BAR_FUNDING_COUNTDOWN),
    ).toBeOnTheScreen();
  });

  it('prefers the live WebSocket funding rate when available', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      BTC: { funding: 0.0005 },
    } as unknown as Record<string, never>);

    const { getByText } = renderComponent();

    // 0.0005 -> 0.0500% via formatFundingRate.
    expect(getByText('0.0500%')).toBeOnTheScreen();
  });

  it('falls back to the stats hook funding rate when live data is undefined', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      BTC: {},
    } as unknown as Record<string, never>);

    const { getByText } = renderComponent();

    expect(getByText('0.0125%')).toBeOnTheScreen();
  });

  it('displays the zero funding rate display when there is no funding data', () => {
    mockUsePerpsMarketStats.mockReturnValue({
      ...mockMarketStats,
      fundingRate: FUNDING_RATE_CONFIG.ZeroDisplay,
    });

    const { getByText } = renderComponent();

    expect(getByText(FUNDING_RATE_CONFIG.ZeroDisplay)).toBeOnTheScreen();
  });

  it('reflects live stat updates on re-render', () => {
    const { getByText, queryByText, rerender } = renderComponent();

    expect(getByText('$1,234,567.89')).toBeOnTheScreen();

    mockUsePerpsMarketStats.mockReturnValue({
      ...mockMarketStats,
      volume24h: '$2,000,000.00',
    });
    rerender(<PerpsProMarketStatsBar {...defaultProps} />);

    expect(getByText('$2,000,000.00')).toBeOnTheScreen();
    expect(queryByText('$1,234,567.89')).not.toBeOnTheScreen();
  });
});
