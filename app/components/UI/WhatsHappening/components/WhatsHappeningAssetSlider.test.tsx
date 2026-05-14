import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import WhatsHappeningAssetSlider from './WhatsHappeningAssetSlider';

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

describe('WhatsHappeningAssetSlider', () => {
  it('renders a pill per asset', () => {
    const assets = [
      {
        sourceAssetId: 'a1',
        symbol: 'BTC',
        name: 'Bitcoin',
        caip19: [],
        hlPerpsMarket: ['BTC'],
      },
      {
        sourceAssetId: 'a2',
        symbol: 'ETH',
        name: 'Ethereum',
        caip19: [],
        hlPerpsMarket: ['ETH'],
      },
    ];
    renderWithProvider(<WhatsHappeningAssetSlider assets={assets} />);
    expect(screen.getByText('BTC')).toBeOnTheScreen();
    expect(screen.getByText('ETH')).toBeOnTheScreen();
  });
});
