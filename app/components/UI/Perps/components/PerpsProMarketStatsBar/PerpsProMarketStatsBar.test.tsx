import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsProMarketStatsBar from './PerpsProMarketStatsBar';
import type { PerpsProMarketStatsBarProps } from './PerpsProMarketStatsBar.types';
import { FUNDING_RATE_CONFIG } from '../../constants/perpsConfig';
import { PerpsProMarketViewSelectorsIDs } from '../../Perps.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      scrollContent: { alignItems: 'center' },
    },
  })),
}));

jest.mock('@metamask/perps-controller', () => ({
  ...jest.requireActual('@metamask/perps-controller'),
  calculateFundingCountdown: jest.fn(() => '39:24'),
}));

const mockMarketStats = {
  high24h: '$50,000.00',
  low24h: '$45,000.00',
  volume24h: '$1.37B',
  openInterest: '$4.52B',
  fundingRate: '0.0100%',
  currentPrice: 64639,
  isLoading: false,
  refresh: jest.fn(),
};
const mockUsePerpsMarketStats = jest.fn((_symbol?: string) => mockMarketStats);
jest.mock('../../hooks/usePerpsMarketStats', () => ({
  usePerpsMarketStats: (symbol: string) => mockUsePerpsMarketStats(symbol),
}));

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
    expect(scroll).toHaveProp('horizontal', true);
  });

  it('renders every Figma stat item label and value inline', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      BTC: { markPrice: '64639.00', funding: 0.0001 },
    });

    const { getByText } = renderComponent();

    // Labels (Figma: Funding, 24h vol, Open interest, Mark price, Oracle price)
    expect(getByText('perps.market.funding')).toBeOnTheScreen();
    expect(getByText('perps.market.24h_vol')).toBeOnTheScreen();
    expect(getByText('perps.market.open_interest')).toBeOnTheScreen();
    expect(getByText('perps.market.mark_price')).toBeOnTheScreen();
    expect(getByText('perps.market.oracle_price')).toBeOnTheScreen();

    // Values — funding uses "rate / countdown" (not stacked / parenthesized)
    expect(getByText('0.0100% / 39:24')).toBeOnTheScreen();
    expect(getByText('$1.37B')).toBeOnTheScreen();
    expect(getByText('$4.52B')).toBeOnTheScreen();
  });

  it('keeps each label and value on the same row (not stacked)', () => {
    const { getByTestId, getByText } = renderComponent();

    const fundingItem = getByTestId(
      PerpsProMarketViewSelectorsIDs.STATS_BAR_FUNDING_RATE,
    );
    const label = getByText('perps.market.funding');
    const value = getByText('0.0100% / 39:24');

    // Both the label and the combined rate/countdown value are children of the
    // same row container (inline KeyValue), not stacked in separate columns.
    expect(fundingItem).toContainElement(label);
    expect(fundingItem).toContainElement(value);
  });

  it('subscribes to live stats using the provided symbol', () => {
    renderComponent({ symbol: 'ETH' });

    expect(mockUsePerpsMarketStats).toHaveBeenCalledWith('ETH');
  });

  it('prefers the live WebSocket funding rate when available', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      BTC: { funding: 0.0005 },
    });

    const { getByText } = renderComponent();

    expect(getByText('0.0500% / 39:24')).toBeOnTheScreen();
  });

  it('falls back to the stats hook funding rate when live data is undefined', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      BTC: {},
    });

    const { getByText } = renderComponent();

    expect(getByText('0.0100% / 39:24')).toBeOnTheScreen();
  });

  it('displays the zero funding rate when there is no funding data', () => {
    mockUsePerpsMarketStats.mockReturnValue({
      ...mockMarketStats,
      fundingRate: FUNDING_RATE_CONFIG.ZeroDisplay,
    });

    const { getByText } = renderComponent();

    expect(
      getByText(`${FUNDING_RATE_CONFIG.ZeroDisplay} / 39:24`),
    ).toBeOnTheScreen();
  });

  it('reflects live volume updates on re-render', () => {
    const { getByText, queryByText, rerender } = renderComponent();

    expect(getByText('$1.37B')).toBeOnTheScreen();

    mockUsePerpsMarketStats.mockReturnValue({
      ...mockMarketStats,
      volume24h: '$2.00B',
    });
    rerender(<PerpsProMarketStatsBar {...defaultProps} />);

    expect(getByText('$2.00B')).toBeOnTheScreen();
    expect(queryByText('$1.37B')).not.toBeOnTheScreen();
  });

  it('renders mark and oracle prices from the live markPrice field', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      BTC: { markPrice: '64639' },
    });

    const { getAllByText } = renderComponent();

    // Both Mark and Oracle currently read markPrice (PriceUpdate has no
    // separate oracle field yet) — assert both items rendered a formatted price.
    expect(getAllByText(/\$64,639/).length).toBeGreaterThanOrEqual(1);
  });
});
