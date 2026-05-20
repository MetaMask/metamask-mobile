import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import WhatsHappeningCard from './WhatsHappeningCard';
import type { WhatsHappeningItem } from '../types';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn((eventName: string) => ({
  addProperties: jest.fn((properties: Record<string, unknown>) => ({
    build: jest.fn(() => ({ category: eventName, properties })),
  })),
  build: jest.fn(() => ({ category: eventName })),
}));

let capturedOnVisible: (() => void) | null = null;
jest.mock('../../MarketInsights/hooks/useViewportTracking', () => ({
  useViewportTracking: (onVisible: () => void) => {
    capturedOnVisible = onVisible;
    return { ref: { current: null }, onLayout: jest.fn() };
  },
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock(
  '../../../Views/WhatsHappeningDetailView/hooks/useWhatsHappeningAssetPrices',
  () => ({
    useWhatsHappeningAssetPrices: jest.fn(() => ({
      perpsPriceBySymbol: {},
    })),
  }),
);

jest.mock(
  '../../../Views/WhatsHappeningDetailView/hooks/useTradeNavigation',
  () => ({
    __esModule: true,
    default: jest.fn(() => ({
      handleTrade: jest.fn(),
      canTrade: true,
    })),
  }),
);

jest.mock(
  '../../../Views/WhatsHappeningDetailView/components/RelatedAssetAvatar',
  () => 'RelatedAssetAvatar',
);

jest.mock(
  '../../../Views/WhatsHappeningDetailView/utils/getRelatedAssetImageSource',
  () => ({
    getRelatedAssetImageSource: jest.fn(() => undefined),
  }),
);

jest.mock('@metamask/perps-controller', () => ({
  getPerpsDisplaySymbol: jest.fn((symbol: string) => {
    const colonIndex = symbol.indexOf(':');
    if (colonIndex > 0 && colonIndex < symbol.length - 1) {
      return symbol.substring(colonIndex + 1);
    }
    return symbol;
  }),
}));

const mockRelatedAsset = {
  sourceAssetId: 'btc-mainnet',
  symbol: 'BTC',
  name: 'Bitcoin',
  caip19: ['eip155:1/slip44:0'],
  hlPerpsMarket: ['BTC'],
};

const baseItem: WhatsHappeningItem = {
  id: 'trend-0',
  title: 'Bitcoin ETF inflows hit record high',
  description: 'Spot Bitcoin ETFs recorded over $1.2B in net inflows.',
  date: new Date(new Date().getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  category: 'macro',
  impact: 'positive',
  relatedAssets: [mockRelatedAsset],
  articles: [],
};

describe('WhatsHappeningCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnVisible = null;
  });

  it('renders title and description', () => {
    renderWithProvider(
      <WhatsHappeningCard item={baseItem} cardIndex={0} source="homepage" />,
    );
    expect(screen.getByText(baseItem.title)).toBeOnTheScreen();
    expect(screen.getByText(baseItem.description)).toBeOnTheScreen();
  });

  it('does not render category badge', () => {
    renderWithProvider(
      <WhatsHappeningCard item={baseItem} cardIndex={0} source="homepage" />,
    );
    expect(screen.queryByText('Macro')).toBeNull();
  });

  it('renders Bullish impact badge for positive impact', () => {
    const item = { ...baseItem, impact: 'positive' as const };
    renderWithProvider(
      <WhatsHappeningCard item={item} cardIndex={0} source="homepage" />,
    );
    expect(screen.getByText('Bullish')).toBeOnTheScreen();
  });

  it('renders Bearish impact badge for negative impact', () => {
    const item = { ...baseItem, impact: 'negative' as const };
    renderWithProvider(
      <WhatsHappeningCard item={item} cardIndex={0} source="homepage" />,
    );
    expect(screen.getByText('Bearish')).toBeOnTheScreen();
  });

  it('renders Neutral impact badge for neutral impact', () => {
    const item = { ...baseItem, impact: 'neutral' as const };
    renderWithProvider(
      <WhatsHappeningCard item={item} cardIndex={0} source="homepage" />,
    );
    expect(screen.getByText('Neutral')).toBeOnTheScreen();
  });

  it('does not render impact badge when impact is absent', () => {
    const item = { ...baseItem, impact: undefined };
    renderWithProvider(
      <WhatsHappeningCard item={item} cardIndex={0} source="homepage" />,
    );
    expect(screen.queryByText('Bullish')).toBeNull();
    expect(screen.queryByText('Bearish')).toBeNull();
    expect(screen.queryByText('Neutral')).toBeNull();
  });

  it('renders the asset symbol on the pill when there is a single related asset', () => {
    renderWithProvider(
      <WhatsHappeningCard item={baseItem} cardIndex={0} source="homepage" />,
    );
    expect(screen.getByText('BTC')).toBeOnTheScreen();
  });

  it('renders a pill symbol for each related asset', () => {
    const ethAsset = {
      sourceAssetId: 'eth-mainnet',
      symbol: 'ETH',
      name: 'Ethereum',
      caip19: ['eip155:1/slip44:60'],
      hlPerpsMarket: ['ETH'],
    };
    const solAsset = {
      sourceAssetId: 'sol-mainnet',
      symbol: 'SOL',
      name: 'Solana',
      caip19: ['solana:mainnet/slip44:501'],
      hlPerpsMarket: ['SOL'],
    };
    const item = {
      ...baseItem,
      relatedAssets: [mockRelatedAsset, ethAsset, solAsset],
    };
    renderWithProvider(
      <WhatsHappeningCard item={item} cardIndex={0} source="homepage" />,
    );
    expect(screen.getByText('BTC')).toBeOnTheScreen();
    expect(screen.getByText('ETH')).toBeOnTheScreen();
    expect(screen.getByText('SOL')).toBeOnTheScreen();
  });

  it('strips xyz: prefix from symbol on the pill', () => {
    const brentAsset = {
      sourceAssetId: 'brentoil',
      symbol: 'xyz:BRENTOIL',
      name: 'Brent Oil',
      caip19: [],
      hlPerpsMarket: ['xyz:BRENT'],
    };
    const item = { ...baseItem, relatedAssets: [brentAsset] };

    renderWithProvider(
      <WhatsHappeningCard item={item} cardIndex={0} source="homepage" />,
    );

    expect(screen.getByText('BRENTOIL')).toBeOnTheScreen();
    expect(screen.queryByText('xyz:BRENTOIL')).toBeNull();
  });

  it('strips xyz: prefix from each pill when multiple assets', () => {
    const brentAsset = {
      sourceAssetId: 'brentoil',
      symbol: 'xyz:BRENTOIL',
      name: 'Brent Oil',
      caip19: [],
      hlPerpsMarket: ['xyz:BRENT'],
    };
    const wtiAsset = {
      sourceAssetId: 'wti',
      symbol: 'xyz:WTI',
      name: 'WTI Oil',
      caip19: [],
      hlPerpsMarket: ['xyz:WTI'],
    };
    const item = {
      ...baseItem,
      relatedAssets: [brentAsset, wtiAsset],
    };

    renderWithProvider(
      <WhatsHappeningCard item={item} cardIndex={0} source="homepage" />,
    );

    expect(screen.getByText('BRENTOIL')).toBeOnTheScreen();
    expect(screen.getByText('WTI')).toBeOnTheScreen();
    expect(screen.queryByText('xyz:BRENTOIL')).toBeNull();
  });

  it('does not alter symbols that have no xyz: prefix', () => {
    renderWithProvider(
      <WhatsHappeningCard item={baseItem} cardIndex={0} source="homepage" />,
    );
    expect(screen.getByText('BTC')).toBeOnTheScreen();
  });

  it('does not render asset pills when relatedAssets is empty', () => {
    const item = { ...baseItem, relatedAssets: [] };
    renderWithProvider(
      <WhatsHappeningCard item={item} cardIndex={0} source="homepage" />,
    );
    expect(screen.queryByText('BTC')).toBeNull();
  });

  it('renders relative time at the top when date is valid', () => {
    renderWithProvider(
      <WhatsHappeningCard item={baseItem} cardIndex={0} source="homepage" />,
    );
    expect(screen.getByText('4d ago')).toBeOnTheScreen();
  });

  it('does not render date when date string is invalid', () => {
    const item = { ...baseItem, date: 'not-a-date' };
    renderWithProvider(
      <WhatsHappeningCard item={item} cardIndex={0} source="homepage" />,
    );
    expect(screen.queryByText('not-a-date')).toBeNull();
  });

  it('calls onPress with the item when tapped', () => {
    const onPress = jest.fn();
    renderWithProvider(
      <WhatsHappeningCard
        item={baseItem}
        cardIndex={0}
        source="homepage"
        onPress={onPress}
      />,
    );
    fireEvent.press(screen.getByText(baseItem.title));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(baseItem);
  });

  it('does not throw when onPress is not provided', () => {
    renderWithProvider(
      <WhatsHappeningCard item={baseItem} cardIndex={0} source="homepage" />,
    );
    expect(() =>
      fireEvent.press(screen.getByText(baseItem.title)),
    ).not.toThrow();
  });

  it('tracks Whats Happening Card Scrolled to View when card becomes visible', () => {
    renderWithProvider(
      <WhatsHappeningCard item={baseItem} cardIndex={2} source="homepage" />,
    );
    expect(capturedOnVisible).not.toBeNull();
    capturedOnVisible?.();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_HAPPENING_CARD_SCROLLED_TO_VIEW,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: MetaMetricsEvents.WHATS_HAPPENING_CARD_SCROLLED_TO_VIEW,
        properties: expect.objectContaining({
          trend_id: 'trend-0',
          card_index: 2,
          trend_category: 'macro',
          trend_impact: 'positive',
          asset_symbols: ['BTC'],
          source: 'homepage',
        }),
      }),
    );
  });
});
