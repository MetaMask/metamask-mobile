import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PerpsRow from './PerpsRow';
import Routes from '../../../../constants/navigation/Routes';
import type { RelatedAsset } from '@metamask/ai-controllers';
import type { WhatsHappeningItem } from '../../../UI/WhatsHappening/types';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import type { PerpsPriceEntry } from '../hooks/useWhatsHappeningAssetPrices';

const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockPlayImpact = jest.fn();

jest.mock('../../../../util/haptics', () => ({
  playImpact: (moment: string) => mockPlayImpact(moment),
  ImpactMoment: { PrimaryCTA: 'primaryCta' },
}));
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

const perpsOnlyAsset: RelatedAsset = {
  sourceAssetId: 'tsla',
  symbol: 'TSLA',
  name: 'Tesla',
  caip19: [],
  hlPerpsMarket: ['xyz:TSLA'],
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
        source="homepage"
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
        source="homepage"
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
        source="homepage"
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

  it('uses first hlPerpsMarket entry as the market symbol when multiple are present', () => {
    const multiMarketAsset: RelatedAsset = {
      ...perpsOnlyAsset,
      hlPerpsMarket: ['FIRST-MARKET', 'SECOND-MARKET'],
    };
    renderWithProvider(
      <PerpsRow
        asset={multiMarketAsset}
        item={mockItem}
        cardIndex={0}
        source="homepage"
        perpsPriceBySymbol={emptyPriceMap}
      />,
    );
    fireEvent.press(screen.getByText('Trade'));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: expect.objectContaining({
        market: { symbol: 'FIRST-MARKET', name: 'Tesla' },
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
        source="homepage"
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
        source="homepage"
        perpsPriceBySymbol={emptyPriceMap}
      />,
    );
    fireEvent.press(screen.getByText('Trade'));
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_HAPPENING_INTERACTED,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: MetaMetricsEvents.WHATS_HAPPENING_INTERACTED,
        properties: expect.objectContaining({
          interaction_type: 'trade_pressed',
          asset_symbol: 'TSLA',
          perps_market: 'xyz:TSLA',
          trend_id: 'trend-3',
          card_index: 1,
          trend_category: 'macro',
          trend_impact: 'positive',
          source: 'homepage',
        }),
      }),
    );
  });

  it('plays primary CTA haptic feedback on Trade press', () => {
    renderWithProvider(
      <PerpsRow
        asset={perpsOnlyAsset}
        item={mockItem}
        cardIndex={0}
        source="homepage"
        perpsPriceBySymbol={emptyPriceMap}
      />,
    );
    fireEvent.press(screen.getByText('Trade'));
    expect(mockPlayImpact).toHaveBeenCalledWith('primaryCta');
  });

  it('does not play haptic feedback when perps market is missing', () => {
    const assetNoPerps: RelatedAsset = {
      ...perpsOnlyAsset,
      hlPerpsMarket: [],
    };
    renderWithProvider(
      <PerpsRow
        asset={assetNoPerps}
        item={mockItem}
        cardIndex={0}
        source="homepage"
        perpsPriceBySymbol={emptyPriceMap}
      />,
    );
    expect(mockPlayImpact).not.toHaveBeenCalled();
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
        source="homepage"
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
        source="homepage"
        perpsPriceBySymbol={emptyPriceMap}
      />,
    );
    expect(screen.queryByText('$')).toBeNull();
  });
});
