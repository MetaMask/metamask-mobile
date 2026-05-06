import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PerpsRow from './PerpsRow';
import Routes from '../../../../constants/navigation/Routes';
import type { RelatedAsset } from '@metamask/ai-controllers';

const mockNavigate = jest.fn();

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

const perpsOnlyAsset: RelatedAsset = {
  sourceAssetId: 'tsla',
  symbol: 'TSLA',
  name: 'Tesla',
  caip19: [],
  hlPerpsMarket: ['xyz:TSLA'],
};

const dualAsset: RelatedAsset = {
  sourceAssetId: 'bitcoin',
  symbol: 'BTC',
  name: 'Bitcoin',
  caip19: ['eip155:1/slip44:0'],
  hlPerpsMarket: ['BTC'],
};

describe('PerpsRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the asset symbol', () => {
    renderWithProvider(<PerpsRow asset={perpsOnlyAsset} />);
    expect(screen.getByText('TSLA')).toBeOnTheScreen();
  });

  it('renders the Trade button', () => {
    renderWithProvider(<PerpsRow asset={perpsOnlyAsset} />);
    expect(screen.getByText('Trade')).toBeOnTheScreen();
  });

  it('navigates to PerpsMarketDetails with minimal market payload on Trade press', () => {
    renderWithProvider(<PerpsRow asset={perpsOnlyAsset} />);
    fireEvent.press(screen.getByText('Trade'));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: expect.objectContaining({
        market: { symbol: 'xyz:TSLA', name: 'Tesla' },
      }),
    });
  });

  it('uses first hlPerpsMarket entry as the market symbol', () => {
    renderWithProvider(<PerpsRow asset={dualAsset} />);
    fireEvent.press(screen.getByText('Trade'));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: expect.objectContaining({
        market: { symbol: 'BTC', name: 'Bitcoin' },
      }),
    });
  });

  it('does not navigate when hlPerpsMarket is empty', () => {
    const assetNoPerps: RelatedAsset = {
      ...perpsOnlyAsset,
      hlPerpsMarket: [],
    };
    renderWithProvider(<PerpsRow asset={assetNoPerps} />);
    fireEvent.press(screen.getByText('Trade'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
