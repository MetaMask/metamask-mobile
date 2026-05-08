import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PerpsRow from './PerpsRow';
import Routes from '../../../../constants/navigation/Routes';
import type { RelatedAsset } from '@metamask/ai-controllers';
import type { WhatsHappeningItem } from '../../Homepage/Sections/WhatsHappening/types';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import type { PerpsPriceEntry } from '../hooks/useWhatsHappeningAssetPrices';

const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn((eventName: string) => ({
  addProperties: jest.fn((properties: Record<string, unknown>) => ({
    build: jest.fn(() => ({ category: eventName, properties })),
  })),
  build: jest.fn(() => ({ category: eventName })),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate }),
  };
});

jest.mock('../utils/getRelatedAssetImageSource', () => ({
  getRelatedAssetImageSource: jest.fn(() => undefined),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock(
  '../../../UI/Tokens/components/TokenListSecurityBadge/TokenListSecurityBadge',
  () => 'TokenListSecurityBadge',
);

jest.mock(
  '../../../../selectors/featureFlagController/tokenListSecurityBadges',
  () => ({
    selectTokenListSecurityBadgesEnabled: jest.fn(() => true),
  }),
);

const perpsOnlyAsset: RelatedAsset = {
  sourceAssetId: 'tsla',
  symbol: 'TSLA',
  name: 'Tesla',
  caip19: [],
  hlPerpsMarket: ['xyz:TSLA'],
};

/** Asset that has both a perps market AND a caip19 id — eligible for badge */
const dualAsset: RelatedAsset = {
  sourceAssetId: 'bitcoin',
  symbol: 'BTC',
  name: 'Bitcoin',
  caip19: ['eip155:1/slip44:0'],
  hlPerpsMarket: ['BTC'],
};

const mockItem: WhatsHappeningItem = {
  id: 'trend-3',
  title: 'TSLA earnings',
  description: '...',
  date: '2026-03-15T10:00:00.000Z',
  category: 'macro',
  impact: 'positive',
  relatedAssets: [perpsOnlyAsset],
  articles: [],
};

const emptyPriceMap: Record<string, PerpsPriceEntry> = {};

describe('PerpsRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the asset name', () => {
    renderWithProvider(
      <PerpsRow
        asset={perpsOnlyAsset}
        item={mockItem}
        cardIndex={0}
        perpsPriceBySymbol={emptyPriceMap}
      />,
    );
    expect(screen.getByText('Tesla')).toBeOnTheScreen();
  });

  it('renders the Trade button', () => {
    renderWithProvider(
      <PerpsRow
        asset={perpsOnlyAsset}
        item={mockItem}
        cardIndex={0}
        perpsPriceBySymbol={emptyPriceMap}
      />,
    );
    expect(screen.getByText('Trade')).toBeOnTheScreen();
  });

  it('navigates to PerpsMarketDetails with minimal market payload on Trade press', () => {
    renderWithProvider(
      <PerpsRow
        asset={perpsOnlyAsset}
        item={mockItem}
        cardIndex={0}
        perpsPriceBySymbol={emptyPriceMap}
      />,
    );
    fireEvent.press(screen.getByText('Trade'));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: expect.objectContaining({
        market: { symbol: 'xyz:TSLA', name: 'Tesla' },
      }),
    });
  });

  it('uses first hlPerpsMarket entry as the market symbol', () => {
    renderWithProvider(
      <PerpsRow
        asset={dualAsset}
        item={mockItem}
        cardIndex={0}
        perpsPriceBySymbol={emptyPriceMap}
      />,
    );
    fireEvent.press(screen.getByText('Trade'));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: expect.objectContaining({
        market: { symbol: 'BTC', name: 'Bitcoin' },
      }),
    });
  });

  it('does not render Trade when hlPerpsMarket is empty', () => {
    const assetNoPerps: RelatedAsset = {
      ...perpsOnlyAsset,
      hlPerpsMarket: [],
    };
    renderWithProvider(
      <PerpsRow
        asset={assetNoPerps}
        item={mockItem}
        cardIndex={0}
        perpsPriceBySymbol={emptyPriceMap}
      />,
    );
    expect(screen.queryByText('Trade')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockCreateEventBuilder).not.toHaveBeenCalled();
  });

  it('tracks Whats Happening Interaction on Trade press', () => {
    renderWithProvider(
      <PerpsRow
        asset={perpsOnlyAsset}
        item={mockItem}
        cardIndex={1}
        perpsPriceBySymbol={emptyPriceMap}
      />,
    );
    fireEvent.press(screen.getByText('Trade'));
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_HAPPENING_INTERACTION,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: MetaMetricsEvents.WHATS_HAPPENING_INTERACTION,
        properties: expect.objectContaining({
          interaction_type: 'trade_pressed',
          asset_symbol: 'TSLA',
          perps_market: 'xyz:TSLA',
          event_id: 'trend-3',
          card_index: 1,
          category: 'macro',
          impact: 'positive',
        }),
      }),
    );
  });

  it('displays price and 24h change from perpsPriceBySymbol', () => {
    const priceMap: Record<string, PerpsPriceEntry> = {
      'xyz:TSLA': { price: 172.5, percentChange24h: 3.45 },
    };
    renderWithProvider(
      <PerpsRow
        asset={perpsOnlyAsset}
        item={mockItem}
        cardIndex={0}
        perpsPriceBySymbol={priceMap}
      />,
    );
    expect(screen.getByText('$172.50')).toBeOnTheScreen();
    expect(screen.getByText('+3.45%')).toBeOnTheScreen();
  });

  it('shows no price text when no price entry is available', () => {
    renderWithProvider(
      <PerpsRow
        asset={perpsOnlyAsset}
        item={mockItem}
        cardIndex={0}
        perpsPriceBySymbol={emptyPriceMap}
      />,
    );
    expect(screen.queryByText('$')).toBeNull();
  });

  describe('verified badge gating', () => {
    it('renders TokenListSecurityBadge when asset has caip19 and feature flags are enabled', () => {
      renderWithProvider(
        <PerpsRow
          asset={dualAsset}
          item={mockItem}
          cardIndex={0}
          perpsPriceBySymbol={emptyPriceMap}
        />,
        {
          state: {
            settings: { basicFunctionalityEnabled: true },
          },
        },
      );
      const badge = screen.UNSAFE_getByType(
        'TokenListSecurityBadge' as unknown as React.ComponentType,
      );
      expect(badge).toBeTruthy();
      expect(badge.props.caipAssetId).toBe('eip155:1/slip44:0');
    });

    it('does not render TokenListSecurityBadge when basicFunctionalityEnabled is false', () => {
      renderWithProvider(
        <PerpsRow
          asset={dualAsset}
          item={mockItem}
          cardIndex={0}
          perpsPriceBySymbol={emptyPriceMap}
        />,
        {
          state: {
            settings: { basicFunctionalityEnabled: false },
          },
        },
      );
      expect(
        screen.UNSAFE_queryByType(
          'TokenListSecurityBadge' as unknown as React.ComponentType,
        ),
      ).toBeNull();
    });

    it('does not render TokenListSecurityBadge for a perps-only asset (no caip19)', () => {
      renderWithProvider(
        <PerpsRow
          asset={perpsOnlyAsset}
          item={mockItem}
          cardIndex={0}
          perpsPriceBySymbol={emptyPriceMap}
        />,
        {
          state: {
            settings: { basicFunctionalityEnabled: true },
          },
        },
      );
      expect(
        screen.UNSAFE_queryByType(
          'TokenListSecurityBadge' as unknown as React.ComponentType,
        ),
      ).toBeNull();
    });
  });
});
