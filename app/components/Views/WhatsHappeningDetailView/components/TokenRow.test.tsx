import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TokenRow from './TokenRow';
import type { RelatedAsset } from '@metamask/ai-controllers';
import type { WhatsHappeningItem } from '../../Homepage/Sections/WhatsHappening/types';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import Routes from '../../../../constants/navigation/Routes';

const mockGoToBuy = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn((eventName: string) => ({
  addProperties: jest.fn((properties: Record<string, unknown>) => ({
    build: jest.fn(() => ({ category: eventName, properties })),
  })),
  build: jest.fn(() => ({ category: eventName })),
}));

const mockNavigate = jest.fn();

jest.mock('../../../UI/Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({ goToBuy: mockGoToBuy }),
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

const btcAsset: RelatedAsset = {
  sourceAssetId: 'bitcoin',
  symbol: 'BTC',
  name: 'Bitcoin',
  caip19: ['eip155:1/slip44:0'],
};

const dualAsset: RelatedAsset = {
  sourceAssetId: 'eth',
  symbol: 'ETH',
  name: 'Ethereum',
  caip19: ['eip155:1/slip44:60'],
  hlPerpsMarket: ['ETH'],
};

const perpsOnlyAsset: RelatedAsset = {
  sourceAssetId: 'tsla',
  symbol: 'TSLA',
  name: 'Tesla',
  caip19: [],
};

const mockItem: WhatsHappeningItem = {
  id: 'trend-2',
  title: 'BTC ETF inflows',
  description: '...',
  date: '2026-03-15T10:00:00.000Z',
  category: 'macro',
  impact: 'positive',
  relatedAssets: [btcAsset],
  articles: [],
};

describe('TokenRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when asset has only caip19 (no hlPerpsMarket)', () => {
    it('renders the asset symbol', () => {
      renderWithProvider(
        <TokenRow asset={btcAsset} item={mockItem} cardIndex={0} />,
      );
      expect(screen.getByText('BTC')).toBeOnTheScreen();
    });

    it('renders the Buy button', () => {
      renderWithProvider(
        <TokenRow asset={btcAsset} item={mockItem} cardIndex={0} />,
      );
      expect(screen.getByText('Buy')).toBeOnTheScreen();
    });

    it('calls goToBuy with the first caip19 identifier on Buy press', () => {
      renderWithProvider(
        <TokenRow asset={btcAsset} item={mockItem} cardIndex={0} />,
      );
      fireEvent.press(screen.getByText('Buy'));
      expect(mockGoToBuy).toHaveBeenCalledWith({
        assetId: 'eip155:1/slip44:0',
      });
    });
  });

  it('calls goToBuy with assetId undefined when caip19 is empty', () => {
    renderWithProvider(
      <TokenRow asset={perpsOnlyAsset} item={mockItem} cardIndex={0} />,
    );
    fireEvent.press(screen.getByText('Buy'));
    expect(mockGoToBuy).toHaveBeenCalledWith({ assetId: undefined });
  });

  describe('when asset has hlPerpsMarket (dual asset)', () => {
    it('renders the Trade button instead of Buy', () => {
      renderWithProvider(
        <TokenRow asset={dualAsset} item={mockItem} cardIndex={0} />,
      );
      expect(screen.getByText('Trade')).toBeOnTheScreen();
      expect(screen.queryByText('Buy')).toBeNull();
    });

    it('navigates to Perps market details on Trade press', () => {
      renderWithProvider(
        <TokenRow asset={dualAsset} item={mockItem} cardIndex={0} />,
      );
      fireEvent.press(screen.getByText('Trade'));
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: expect.objectContaining({
          market: { symbol: 'ETH', name: 'Ethereum' },
        }),
      });
    });

    it('does not call goToBuy when Trade is pressed', () => {
      renderWithProvider(
        <TokenRow asset={dualAsset} item={mockItem} cardIndex={0} />,
      );
      fireEvent.press(screen.getByText('Trade'));
      expect(mockGoToBuy).not.toHaveBeenCalled();
    });
  });

  it('tracks Whats Happening Interaction with interaction_type=buy_pressed and asset details on Buy press', () => {
    renderWithProvider(
      <TokenRow asset={btcAsset} item={mockItem} cardIndex={2} />,
    );
    fireEvent.press(screen.getByText('Buy'));
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_HAPPENING_INTERACTION,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: MetaMetricsEvents.WHATS_HAPPENING_INTERACTION,
        properties: expect.objectContaining({
          interaction_type: 'buy_pressed',
          asset_symbol: 'BTC',
          asset_caip19: 'eip155:1/slip44:0',
          event_id: 'trend-2',
          card_index: 2,
          category: 'macro',
          impact: 'positive',
        }),
      }),
    );
  });

  it('tracks Interaction without asset_caip19 when caip19 is empty', () => {
    renderWithProvider(
      <TokenRow asset={perpsOnlyAsset} item={mockItem} cardIndex={0} />,
    );
    fireEvent.press(screen.getByText('Buy'));
    const addPropertiesCall = mockCreateEventBuilder.mock.results[0]?.value
      ?.addProperties as jest.Mock | undefined;
    const builtProperties = addPropertiesCall?.mock?.calls?.[0]?.[0] as
      | Record<string, string>
      | undefined;
    expect(builtProperties?.interaction_type).toBe('buy_pressed');
    expect(builtProperties?.asset_symbol).toBe('TSLA');
    expect(builtProperties).not.toHaveProperty('asset_caip19');
  });
});
