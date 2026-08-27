import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PerpsMarketData } from '@metamask/perps-controller';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { PerpsRecentlyViewedRailSelectorsIDs } from '../../Perps.testIds';
import PerpsRecentlyViewedRail, {
  RECENTLY_VIEWED_EVENT_PROPERTY,
  RECENTLY_VIEWED_MARKET_CLICKED,
} from './PerpsRecentlyViewedRail';

const mockTrack = jest.fn();

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({
    track: mockTrack,
  }),
}));

jest.mock('../../hooks/stream', () => ({
  usePerpsLivePrices: jest.fn(() => ({})),
}));

const { usePerpsLivePrices } = jest.requireMock('../../hooks/stream');
const mockUsePerpsLivePrices = usePerpsLivePrices as jest.MockedFunction<
  typeof import('../../hooks/stream').usePerpsLivePrices
>;

jest.mock('@metamask/design-system-react-native', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    ...jest.requireActual('@metamask/design-system-react-native'),
    SectionHeader: ({ title, testID }: { title: string; testID?: string }) => (
      <Text testID={testID}>{title}</Text>
    ),
  };
});

jest.mock('../PerpsTokenLogo/PerpsTokenLogo', () => {
  const { View } = jest.requireActual('react-native');
  return ({ symbol }: { symbol: string }) => (
    <View testID={`token-logo-${symbol}`} />
  );
});

const createMarket = (
  symbol: string,
  overrides: Partial<PerpsMarketData> = {},
): PerpsMarketData => ({
  symbol,
  name: symbol,
  maxLeverage: '10x',
  price: '$1.00',
  change24h: '$0.01',
  change24hPercent: '+1.00%',
  volume: '$1M',
  ...overrides,
});

describe('PerpsRecentlyViewedRail', () => {
  const mockOnMarketPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsLivePrices.mockReturnValue({});
  });

  it('renders nothing when there are no recently viewed markets', () => {
    render(
      <PerpsRecentlyViewedRail
        markets={[]}
        onMarketPress={mockOnMarketPress}
      />,
    );

    expect(
      screen.queryByTestId(PerpsRecentlyViewedRailSelectorsIDs.RAIL),
    ).toBeNull();
  });

  it('renders the header and a pill for each recently viewed market', () => {
    render(
      <PerpsRecentlyViewedRail
        markets={[createMarket('BTC'), createMarket('ETH')]}
        onMarketPress={mockOnMarketPress}
      />,
    );

    expect(
      screen.getByTestId(PerpsRecentlyViewedRailSelectorsIDs.RAIL),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsRecentlyViewedRailSelectorsIDs.PILL_GRID),
    ).toBeOnTheScreen();
    expect(screen.getByText('Recently viewed')).toBeOnTheScreen();
    expect(
      screen.getByTestId('perps-recently-viewed-tile-BTC'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('perps-recently-viewed-tile-ETH'),
    ).toBeOnTheScreen();
  });

  it('renders each market logo, symbol and percent change', () => {
    render(
      <PerpsRecentlyViewedRail
        markets={[
          createMarket('BTC', {
            change24hPercent: '+2.50%',
          }),
        ]}
        onMarketPress={mockOnMarketPress}
      />,
    );

    expect(screen.getByTestId('token-logo-BTC')).toBeOnTheScreen();
    expect(screen.getByText('BTC')).toBeOnTheScreen();
    expect(screen.getByText('+2.50%')).toBeOnTheScreen();
  });

  it('subscribes to live prices with the same throttle as market list rows', () => {
    render(
      <PerpsRecentlyViewedRail
        markets={[createMarket('BTC')]}
        onMarketPress={mockOnMarketPress}
      />,
    );

    expect(mockUsePerpsLivePrices).toHaveBeenCalledWith({
      symbols: ['BTC'],
      throttleMs: 3000,
    });
  });

  it('overlays live 24h percent change onto the pill', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      BTC: {
        price: '55000.00',
        percentChange24h: '5.77',
      },
    });

    render(
      <PerpsRecentlyViewedRail
        markets={[
          createMarket('BTC', {
            change24hPercent: '+1.00%',
          }),
        ]}
        onMarketPress={mockOnMarketPress}
      />,
    );

    expect(screen.getByText('+5.77%')).toBeOnTheScreen();
    expect(screen.queryByText('+1.00%')).toBeNull();
  });

  it('overlays a live negative 24h percent change onto the pill', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      BTC: {
        price: '48000.00',
        percentChange24h: '-7.84',
      },
    });

    render(
      <PerpsRecentlyViewedRail
        markets={[
          createMarket('BTC', {
            change24hPercent: '+1.00%',
          }),
        ]}
        onMarketPress={mockOnMarketPress}
      />,
    );

    expect(screen.getByText('-7.84%')).toBeOnTheScreen();
  });

  it('strips the dex prefix from the displayed symbol', () => {
    render(
      <PerpsRecentlyViewedRail
        markets={[createMarket('xyz:TSLA')]}
        onMarketPress={mockOnMarketPress}
      />,
    );

    expect(screen.getByText('TSLA')).toBeOnTheScreen();
    expect(screen.queryByText('xyz:TSLA')).toBeNull();
  });

  it('preserves the newest-first order passed in via props', () => {
    render(
      <PerpsRecentlyViewedRail
        markets={[createMarket('SOL'), createMarket('BTC')]}
        onMarketPress={mockOnMarketPress}
      />,
    );

    const tiles = screen.getAllByTestId(/^perps-recently-viewed-tile-/);
    expect(tiles[0].props.testID).toBe('perps-recently-viewed-tile-SOL');
    expect(tiles[1].props.testID).toBe('perps-recently-viewed-tile-BTC');
  });

  it('caps rendered pills at 10', () => {
    const markets = Array.from({ length: 15 }, (_, i) =>
      createMarket(`MKT${i}`),
    );

    render(
      <PerpsRecentlyViewedRail
        markets={markets}
        onMarketPress={mockOnMarketPress}
      />,
    );

    const tiles = screen.getAllByTestId(/^perps-recently-viewed-tile-/);
    expect(tiles).toHaveLength(10);
  });

  it('tracks pill tap with market symbol and 1-based position, then invokes onMarketPress', () => {
    const target = createMarket('ETH');

    render(
      <PerpsRecentlyViewedRail
        markets={[createMarket('BTC'), target]}
        onMarketPress={mockOnMarketPress}
      />,
    );

    fireEvent.press(screen.getByTestId('perps-recently-viewed-tile-ETH'));

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        interaction_type: RECENTLY_VIEWED_MARKET_CLICKED,
        [RECENTLY_VIEWED_EVENT_PROPERTY.MARKET]: 'ETH',
        [RECENTLY_VIEWED_EVENT_PROPERTY.POSITION]: 2,
      },
    );
    expect(mockOnMarketPress).toHaveBeenCalledWith(target, 1);
  });
});
