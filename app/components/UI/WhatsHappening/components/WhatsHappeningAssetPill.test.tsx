import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import WhatsHappeningAssetPill from './WhatsHappeningAssetPill';

const mockHandleTrade = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn((eventName: string) => ({
  addProperties: jest.fn(() => ({
    build: jest.fn(() => ({ category: eventName })),
  })),
  build: jest.fn(() => ({ category: eventName })),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock(
  '../../../Views/WhatsHappeningDetailView/hooks/useTradeNavigation',
  () => ({
    __esModule: true,
    default: jest.fn(() => ({
      handleTrade: mockHandleTrade,
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
  getPerpsDisplaySymbol: (symbol: string) => symbol,
}));

const baseAsset = {
  sourceAssetId: 'btc',
  symbol: 'BTC',
  name: 'Bitcoin',
  caip19: ['eip155:1/slip44:0'] as string[],
  hlPerpsMarket: ['BTC'] as string[],
};

const baseItem = {
  id: 'trend-0',
  title: 'Test headline',
  description: 'Test description',
  date: '2026-01-01T00:00:00.000Z',
  impact: 'positive' as const,
  relatedAssets: [baseAsset],
  articles: [],
};

const defaultProps = {
  asset: baseAsset,
  item: baseItem,
  cardIndex: 0,
  source: 'homepage' as const,
};

describe('WhatsHappeningAssetPill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const useTradeNavigation = jest.requireMock(
      '../../../Views/WhatsHappeningDetailView/hooks/useTradeNavigation',
    ).default;
    useTradeNavigation.mockReturnValue({
      handleTrade: mockHandleTrade,
      canTrade: true,
    });
  });

  it('renders display symbol', () => {
    renderWithProvider(<WhatsHappeningAssetPill {...defaultProps} />);
    expect(screen.getByText('BTC')).toBeOnTheScreen();
  });

  it('calls handleTrade when canTrade and pressed', () => {
    renderWithProvider(<WhatsHappeningAssetPill {...defaultProps} />);
    fireEvent.press(screen.getByLabelText('BTC'));
    expect(mockHandleTrade).toHaveBeenCalledTimes(1);
  });

  it('fires WHATS_HAPPENING_INTERACTED with related_asset_pressed when pressed', () => {
    renderWithProvider(<WhatsHappeningAssetPill {...defaultProps} />);
    fireEvent.press(screen.getByLabelText('BTC'));
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    const builderCall = mockCreateEventBuilder.mock.results[0].value;
    expect(builderCall.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        interaction_type: 'related_asset_pressed',
        view: 'carousel',
        asset_symbol: 'BTC',
        perps_market: 'BTC',
        asset_caip19: 'eip155:1/slip44:0',
      }),
    );
  });

  it('does not wrap in button when canTrade is false', () => {
    const useTradeNavigation = jest.requireMock(
      '../../../Views/WhatsHappeningDetailView/hooks/useTradeNavigation',
    ).default;
    useTradeNavigation.mockReturnValue({
      handleTrade: mockHandleTrade,
      canTrade: false,
    });
    renderWithProvider(<WhatsHappeningAssetPill {...defaultProps} />);
    expect(screen.queryByLabelText('BTC')).toBeNull();
    expect(screen.getByText('BTC')).toBeOnTheScreen();
  });

  it('shows positive percent change when perpsPriceEntry has a positive value', () => {
    renderWithProvider(
      <WhatsHappeningAssetPill
        {...defaultProps}
        perpsPriceEntry={{ price: 95000, percentChange24h: 1.23 }}
      />,
    );
    expect(screen.getByText('+1.23%')).toBeOnTheScreen();
  });

  it('shows negative percent change when perpsPriceEntry has a negative value', () => {
    renderWithProvider(
      <WhatsHappeningAssetPill
        {...defaultProps}
        perpsPriceEntry={{ price: 95000, percentChange24h: -2.5 }}
      />,
    );
    expect(screen.getByText('-2.50%')).toBeOnTheScreen();
  });

  it('does not render change text when perpsPriceEntry is undefined', () => {
    renderWithProvider(<WhatsHappeningAssetPill {...defaultProps} />);
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('does not render change text when percentChange24h is undefined', () => {
    renderWithProvider(
      <WhatsHappeningAssetPill
        {...defaultProps}
        perpsPriceEntry={{ price: undefined, percentChange24h: undefined }}
      />,
    );
    expect(screen.queryByText(/%/)).toBeNull();
  });
});
