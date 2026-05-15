import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import WhatsHappeningAssetSlider from './WhatsHappeningAssetSlider';

const mockUseWhatsHappeningAssetPrices = jest.fn();

jest.mock(
  '../../../Views/WhatsHappeningDetailView/hooks/useWhatsHappeningAssetPrices',
  () => ({
    useWhatsHappeningAssetPrices: (assets: unknown) =>
      mockUseWhatsHappeningAssetPrices(assets),
  }),
);

jest.mock(
  '../../../Views/WhatsHappeningDetailView/hooks/useTradeNavigation',
  () => ({
    __esModule: true,
    default: () => ({
      handleTrade: jest.fn(),
      canTrade: true,
    }),
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

const btcAsset = {
  sourceAssetId: 'a1',
  symbol: 'BTC',
  name: 'Bitcoin',
  caip19: [],
  hlPerpsMarket: ['BTC'],
};

const ethAsset = {
  sourceAssetId: 'a2',
  symbol: 'ETH',
  name: 'Ethereum',
  caip19: [],
  hlPerpsMarket: ['ETH'],
};

const noPerpsAsset = {
  sourceAssetId: 'a3',
  symbol: 'FOO',
  name: 'Foo',
  caip19: ['eip155:1/erc20:0xfoo'],
};

describe('WhatsHappeningAssetSlider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWhatsHappeningAssetPrices.mockReturnValue({
      perpsPriceBySymbol: {},
    });
  });

  it('renders a pill per perps asset', () => {
    renderWithProvider(
      <WhatsHappeningAssetSlider assets={[btcAsset, ethAsset]} />,
    );
    expect(screen.getByText('BTC')).toBeOnTheScreen();
    expect(screen.getByText('ETH')).toBeOnTheScreen();
  });

  it('filters out non-perps assets', () => {
    renderWithProvider(
      <WhatsHappeningAssetSlider assets={[btcAsset, noPerpsAsset]} />,
    );
    expect(screen.getByText('BTC')).toBeOnTheScreen();
    expect(screen.queryByText('FOO')).toBeNull();
  });

  it('calls useWhatsHappeningAssetPrices only with perps assets', () => {
    renderWithProvider(
      <WhatsHappeningAssetSlider assets={[btcAsset, noPerpsAsset]} />,
    );
    expect(mockUseWhatsHappeningAssetPrices).toHaveBeenCalledWith([btcAsset]);
  });

  it('returns null when all assets are non-perps', () => {
    const { toJSON } = renderWithProvider(
      <WhatsHappeningAssetSlider assets={[noPerpsAsset]} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('shows the price change text when perpsPriceBySymbol has data', () => {
    mockUseWhatsHappeningAssetPrices.mockReturnValue({
      perpsPriceBySymbol: {
        BTC: { price: 95000, percentChange24h: 1.23 },
      },
    });
    renderWithProvider(<WhatsHappeningAssetSlider assets={[btcAsset]} />);
    expect(screen.getByText('+1.23%')).toBeOnTheScreen();
  });

  it('shows negative change in red and hides change text when undefined', () => {
    mockUseWhatsHappeningAssetPrices.mockReturnValue({
      perpsPriceBySymbol: {
        BTC: { price: 95000, percentChange24h: -2.5 },
        ETH: { price: 3000, percentChange24h: undefined },
      },
    });
    renderWithProvider(
      <WhatsHappeningAssetSlider assets={[btcAsset, ethAsset]} />,
    );
    expect(screen.getByText('-2.50%')).toBeOnTheScreen();
    expect(screen.queryByText('undefined')).toBeNull();
  });
});
