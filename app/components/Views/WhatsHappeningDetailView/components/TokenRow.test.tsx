import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TokenRow from './TokenRow';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import type { RelatedAsset } from '@metamask/ai-controllers';

const mockGoToBuy = jest.fn();
const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => ({}));
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
}));

jest.mock('../../UI/Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({ goToBuy: mockGoToBuy }),
}));

jest.mock('../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockDigestId = '2026-03-15T10:00:00.000Z';

const regularAsset: RelatedAsset = {
  name: 'Bitcoin',
  symbol: 'BTC',
  caip19: ['eip155:1/slip44:0'],
  sourceAssetId: 'btc-mainnet',
  hlPerpsMarket: 'BTC',
};

const perpsOnlyAsset: RelatedAsset = {
  name: 'Tesla',
  symbol: 'TSLA',
  caip19: [],
  sourceAssetId: 'tsla-perps',
  hlPerpsMarket: 'xyz:TSLA',
};

describe('TokenRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuild.mockReturnValue({});
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });
  });

  it('renders asset symbol', () => {
    renderWithProvider(
      <TokenRow asset={regularAsset} digestId={mockDigestId} />,
    );
    expect(screen.getByText('BTC')).toBeOnTheScreen();
  });

  it('fires BREAKING_NEWS_TRADE_BUTTON_CLICKED with caip19 for a regular token', () => {
    renderWithProvider(
      <TokenRow asset={regularAsset} digestId={mockDigestId} />,
    );
    fireEvent.press(screen.getByText('Buy'));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.BREAKING_NEWS_TRADE_BUTTON_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        caip19: regularAsset.caip19[0],
        digest_id: mockDigestId,
        destination: 'buy',
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('fires BREAKING_NEWS_TRADE_BUTTON_CLICKED with perps_market for a perps-only asset', () => {
    renderWithProvider(
      <TokenRow asset={perpsOnlyAsset} digestId={mockDigestId} />,
    );
    fireEvent.press(screen.getByText('Buy'));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.BREAKING_NEWS_TRADE_BUTTON_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        perps_market: perpsOnlyAsset.hlPerpsMarket,
        digest_id: mockDigestId,
        destination: 'buy',
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('does not include caip19 in properties for a perps-only asset', () => {
    renderWithProvider(
      <TokenRow asset={perpsOnlyAsset} digestId={mockDigestId} />,
    );
    fireEvent.press(screen.getByText('Buy'));

    expect(mockAddProperties).toHaveBeenCalledTimes(1);
    expect(mockAddProperties).not.toHaveBeenCalledWith(
      expect.objectContaining({ caip19: expect.anything() }),
    );
  });

  it('calls goToBuy after firing the event', () => {
    renderWithProvider(
      <TokenRow asset={regularAsset} digestId={mockDigestId} />,
    );
    fireEvent.press(screen.getByText('Buy'));

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockGoToBuy).toHaveBeenCalledWith({
      assetId: regularAsset.caip19[0],
    });
  });
});
