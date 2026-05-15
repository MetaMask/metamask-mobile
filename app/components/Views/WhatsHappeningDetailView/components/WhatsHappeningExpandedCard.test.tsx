import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import WhatsHappeningExpandedCard from './WhatsHappeningExpandedCard';
import type { WhatsHappeningItem } from '../../../UI/WhatsHappening/types';
import Routes from '../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn((eventName: string) => ({
      addProperties: jest.fn(() => ({
        build: jest.fn(() => ({ category: eventName })),
      })),
      build: jest.fn(() => ({ category: eventName })),
    })),
  }),
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

jest.mock('../../../UI/MarketInsights/utils/marketInsightsFormatting', () => ({
  formatRelativeTime: jest.fn(() => 'now'),
  getUniqueSourcesByFavicon: jest.fn(() => []),
}));

jest.mock(
  '../../../UI/MarketInsights/components/SourceLogoGroup',
  () => 'SourceLogoGroup',
);

jest.mock('../hooks/useWhatsHappeningAssetPrices', () => ({
  useWhatsHappeningAssetPrices: jest.fn(() => ({
    perpsPriceBySymbol: {},
  })),
}));

jest.mock(
  '../../../UI/Tokens/components/TokenListSecurityBadge/TokenListSecurityBadge',
  () => 'TokenListSecurityBadge',
);

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

const CARD_WIDTH = 320;
const CARD_HEIGHT = 600;

const perpsOnlyAsset = {
  sourceAssetId: 'tsla',
  symbol: 'TSLA',
  name: 'Tesla',
  caip19: [],
  hlPerpsMarket: ['xyz:TSLA'],
};

const dualAsset = {
  sourceAssetId: 'btc',
  symbol: 'BTC',
  name: 'Bitcoin',
  caip19: ['eip155:1/slip44:0'],
  hlPerpsMarket: ['BTC'],
};

const baseItem: WhatsHappeningItem = {
  id: 'trend-0',
  title: 'The Federal Reserve pauses interest rates',
  description: 'Reflecting the current economy.',
  date: '2026-03-15T10:00:00.000Z',
  category: 'macro',
  impact: 'positive',
  relatedAssets: [],
  articles: [],
};

describe('WhatsHappeningExpandedCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and description', () => {
    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={baseItem}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
        cardHeight={CARD_HEIGHT}
        source="homepage"
      />,
    );
    expect(screen.getByText(baseItem.title)).toBeOnTheScreen();
    expect(screen.getByText(baseItem.description)).toBeOnTheScreen();
  });

  it('renders the impact badge for positive impact', () => {
    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={baseItem}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
        cardHeight={CARD_HEIGHT}
        source="homepage"
      />,
    );
    expect(screen.getByText('Bullish')).toBeOnTheScreen();
  });

  it('renders the AI pill next to the impact badge', () => {
    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={baseItem}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
        cardHeight={CARD_HEIGHT}
        source="homepage"
      />,
    );
    expect(screen.getByText('AI')).toBeOnTheScreen();
    expect(screen.getByText('Bullish')).toBeOnTheScreen();
  });

  it('renders Neutral badge when impact is explicitly neutral', () => {
    const item = { ...baseItem, impact: 'neutral' as const };
    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={item}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
        cardHeight={CARD_HEIGHT}
        source="homepage"
      />,
    );
    expect(screen.getByText('Neutral')).toBeOnTheScreen();
  });

  it('does not render an impact badge when impact is undefined', () => {
    const item = { ...baseItem, impact: undefined };
    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={item}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
        cardHeight={CARD_HEIGHT}
        source="homepage"
      />,
    );
    expect(screen.queryByText('Neutral')).toBeNull();
    expect(screen.queryByText('Bullish')).toBeNull();
    expect(screen.queryByText('Bearish')).toBeNull();
    expect(screen.queryByText('AI')).toBeNull();
  });

  it('renders the single Related Assets section header when relatedAssets is non-empty', () => {
    const item = { ...baseItem, relatedAssets: [perpsOnlyAsset] };
    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={item}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
        cardHeight={CARD_HEIGHT}
        source="homepage"
      />,
    );
    expect(screen.getByText('Related Assets')).toBeOnTheScreen();
    // No "Tokens" or "Perps" section labels
    expect(screen.queryByText('Tokens')).toBeNull();
    expect(screen.queryByText('Perps')).toBeNull();
  });

  it('renders each asset as a PerpsRow with Trade button', () => {
    const item = { ...baseItem, relatedAssets: [perpsOnlyAsset] };
    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={item}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
        cardHeight={CARD_HEIGHT}
        source="homepage"
      />,
    );
    expect(screen.getByText('Tesla')).toBeOnTheScreen();
    expect(screen.getByText('Trade')).toBeOnTheScreen();
    // No Buy button
    expect(screen.queryByText('Buy')).toBeNull();
  });

  it('renders all assets in the single Related Assets section (including dual caip19+perps)', () => {
    const item = { ...baseItem, relatedAssets: [perpsOnlyAsset, dualAsset] };
    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={item}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
        cardHeight={CARD_HEIGHT}
        source="homepage"
      />,
    );
    expect(screen.getByText('Related Assets')).toBeOnTheScreen();
    expect(screen.getByText('Tesla')).toBeOnTheScreen();
    expect(screen.getByText('Bitcoin')).toBeOnTheScreen();
    expect(screen.getAllByText('Trade')).toHaveLength(2);
    expect(screen.queryByText('Buy')).toBeNull();
  });

  it('does not render the Related Assets section when relatedAssets is empty', () => {
    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={baseItem}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
        cardHeight={CARD_HEIGHT}
        source="homepage"
      />,
    );
    expect(screen.queryByText('Related Assets')).toBeNull();
    expect(screen.queryByText('Trade')).toBeNull();
  });

  it('Trade button navigates to PerpsMarketDetails', () => {
    const item = { ...baseItem, relatedAssets: [perpsOnlyAsset] };
    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={item}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
        cardHeight={CARD_HEIGHT}
        source="homepage"
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

  it('calls onSourcesPress with the item articles when the sources row is pressed', () => {
    const mockOnSourcesPress = jest.fn();
    const article = {
      title: 'Test article',
      source: 'coindesk.com',
      url: 'https://coindesk.com/test',
      date: '2026-03-15T10:00:00.000Z',
    };
    const item = { ...baseItem, articles: [article] };

    const { formatRelativeTime, getUniqueSourcesByFavicon } = jest.requireMock(
      '../../../UI/MarketInsights/utils/marketInsightsFormatting',
    );
    (formatRelativeTime as jest.Mock).mockReturnValueOnce('1d ago');
    (getUniqueSourcesByFavicon as jest.Mock).mockReturnValueOnce([
      { name: 'coindesk.com', type: 'news', url: 'https://coindesk.com' },
    ]);

    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={item}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
        cardHeight={CARD_HEIGHT}
        source="homepage"
        onSourcesPress={mockOnSourcesPress}
      />,
    );

    fireEvent.press(screen.getByText('coindesk.com'));
    expect(mockOnSourcesPress).toHaveBeenCalledWith([article]);
    expect(screen.getByText('1d ago')).toBeOnTheScreen();
  });

  it('passes perpsPriceBySymbol from hook to PerpsRow', () => {
    const mockHook = jest.requireMock('../hooks/useWhatsHappeningAssetPrices');
    const mockPerpsMap = {
      'xyz:TSLA': { price: 172.5, percentChange24h: -1 },
    };
    mockHook.useWhatsHappeningAssetPrices.mockReturnValueOnce({
      perpsPriceBySymbol: mockPerpsMap,
    });

    const item = { ...baseItem, relatedAssets: [perpsOnlyAsset] };
    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={item}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
        cardHeight={CARD_HEIGHT}
        source="homepage"
      />,
    );
    expect(screen.getByText('$172.50')).toBeOnTheScreen();
  });
});
