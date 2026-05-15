import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import WhatsHappeningAssetPill from './WhatsHappeningAssetPill';

const mockHandleTrade = jest.fn();

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
    renderWithProvider(<WhatsHappeningAssetPill asset={baseAsset} />);
    expect(screen.getByText('BTC')).toBeOnTheScreen();
  });

  it('calls handleTrade when canTrade and pressed', () => {
    renderWithProvider(<WhatsHappeningAssetPill asset={baseAsset} />);
    fireEvent.press(screen.getByLabelText('BTC'));
    expect(mockHandleTrade).toHaveBeenCalledTimes(1);
  });

  it('does not wrap in button when canTrade is false', () => {
    const useTradeNavigation = jest.requireMock(
      '../../../Views/WhatsHappeningDetailView/hooks/useTradeNavigation',
    ).default;
    useTradeNavigation.mockReturnValue({
      handleTrade: mockHandleTrade,
      canTrade: false,
    });
    renderWithProvider(<WhatsHappeningAssetPill asset={baseAsset} />);
    expect(screen.queryByLabelText('BTC')).toBeNull();
    expect(screen.getByText('BTC')).toBeOnTheScreen();
  });

  it('shows positive percent change when perpsPriceEntry has a positive value', () => {
    renderWithProvider(
      <WhatsHappeningAssetPill
        asset={baseAsset}
        perpsPriceEntry={{ price: 95000, percentChange24h: 1.23 }}
      />,
    );
    expect(screen.getByText('+1.23%')).toBeOnTheScreen();
  });

  it('shows negative percent change when perpsPriceEntry has a negative value', () => {
    renderWithProvider(
      <WhatsHappeningAssetPill
        asset={baseAsset}
        perpsPriceEntry={{ price: 95000, percentChange24h: -2.5 }}
      />,
    );
    expect(screen.getByText('-2.50%')).toBeOnTheScreen();
  });

  it('does not render change text when perpsPriceEntry is undefined', () => {
    renderWithProvider(<WhatsHappeningAssetPill asset={baseAsset} />);
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('does not render change text when percentChange24h is undefined', () => {
    renderWithProvider(
      <WhatsHappeningAssetPill
        asset={baseAsset}
        perpsPriceEntry={{ price: undefined, percentChange24h: undefined }}
      />,
    );
    expect(screen.queryByText(/%/)).toBeNull();
  });
});
