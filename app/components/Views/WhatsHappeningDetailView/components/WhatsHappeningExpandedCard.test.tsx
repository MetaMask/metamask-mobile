import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import WhatsHappeningExpandedCard from './WhatsHappeningExpandedCard';
import type { WhatsHappeningItem } from '../../Homepage/Sections/WhatsHappening/types';
import Routes from '../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockGoToBuy = jest.fn();

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

jest.mock('../../../UI/Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({ goToBuy: mockGoToBuy }),
}));

jest.mock('../../../UI/MarketInsights/utils/marketInsightsFormatting', () => ({
  formatRelativeTime: jest.fn(() => 'now'),
  getUniqueSourcesByFavicon: jest.fn(() => []),
}));

jest.mock(
  '../../../UI/MarketInsights/components/SourceLogoGroup',
  () => 'SourceLogoGroup',
);

const CARD_WIDTH = 320;

const tokenAsset = {
  sourceAssetId: 'bitcoin',
  symbol: 'BTC',
  name: 'Bitcoin',
  caip19: ['eip155:1/slip44:0'],
  hlPerpsMarket: undefined,
};

const perpsOnlyAsset = {
  sourceAssetId: 'tsla',
  symbol: 'TSLA',
  name: 'Tesla',
  caip19: [],
  hlPerpsMarket: ['xyz:TSLA'],
};

const dualAsset = {
  sourceAssetId: 'eth',
  symbol: 'ETH',
  name: 'Ethereum',
  caip19: ['eip155:1/slip44:60'],
  hlPerpsMarket: ['ETH'],
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
      />,
    );
    expect(screen.getByText('Bullish')).toBeOnTheScreen();
  });

  it('renders Neutral badge when impact is explicitly neutral', () => {
    const item = { ...baseItem, impact: 'neutral' as const };
    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={item}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
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
      />,
    );
    expect(screen.queryByText('Neutral')).toBeNull();
    expect(screen.queryByText('Bullish')).toBeNull();
    expect(screen.queryByText('Bearish')).toBeNull();
  });

  it('renders Tokens section when assets have caip19', () => {
    const item = { ...baseItem, relatedAssets: [tokenAsset] };
    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={item}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
      />,
    );
    expect(screen.getByText('Tokens')).toBeOnTheScreen();
    expect(screen.getByText('BTC')).toBeOnTheScreen();
    expect(screen.getByText('Buy')).toBeOnTheScreen();
  });

  it('does not render Tokens section when no assets have caip19', () => {
    const item = { ...baseItem, relatedAssets: [perpsOnlyAsset] };
    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={item}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
      />,
    );
    expect(screen.queryByText('Tokens')).toBeNull();
    expect(screen.queryByText('Buy')).toBeNull();
  });

  it('renders Perps section when assets have hlPerpsMarket', () => {
    const item = { ...baseItem, relatedAssets: [perpsOnlyAsset] };
    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={item}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
      />,
    );
    expect(screen.getByText('Perps')).toBeOnTheScreen();
    expect(screen.getByText('TSLA')).toBeOnTheScreen();
    expect(screen.getByText('Trade')).toBeOnTheScreen();
  });

  it('does not render Perps section when no assets have hlPerpsMarket', () => {
    const item = { ...baseItem, relatedAssets: [tokenAsset] };
    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={item}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
      />,
    );
    expect(screen.queryByText('Perps')).toBeNull();
    expect(screen.queryByText('Trade')).toBeNull();
  });

  it('renders both Tokens and Perps sections when there are separate token and perps-only assets', () => {
    const item = { ...baseItem, relatedAssets: [tokenAsset, perpsOnlyAsset] };
    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={item}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
      />,
    );
    expect(screen.getByText('Tokens')).toBeOnTheScreen();
    expect(screen.getByText('Perps')).toBeOnTheScreen();
    expect(screen.getByText('Buy')).toBeOnTheScreen();
    expect(screen.getByText('Trade')).toBeOnTheScreen();
  });

  it('does not duplicate a dual asset (caip19 + hlPerpsMarket) into the Perps section', () => {
    const item = { ...baseItem, relatedAssets: [dualAsset] };
    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={item}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
      />,
    );
    expect(screen.getByText('Tokens')).toBeOnTheScreen();
    expect(screen.getByText('Buy')).toBeOnTheScreen();
    expect(screen.queryByText('Perps')).toBeNull();
    expect(screen.queryByText('Trade')).toBeNull();
  });

  it('renders neither section when relatedAssets is empty', () => {
    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={baseItem}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
      />,
    );
    expect(screen.queryByText('Tokens')).toBeNull();
    expect(screen.queryByText('Perps')).toBeNull();
  });

  it('Trade button navigates to PerpsMarketDetails', () => {
    const item = { ...baseItem, relatedAssets: [perpsOnlyAsset] };
    renderWithProvider(
      <WhatsHappeningExpandedCard
        item={item}
        cardIndex={0}
        cardWidth={CARD_WIDTH}
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
});
