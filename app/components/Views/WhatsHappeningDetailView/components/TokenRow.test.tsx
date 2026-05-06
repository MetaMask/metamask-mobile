import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TokenRow from './TokenRow';
import type { RelatedAsset } from '@metamask/ai-controllers';

const mockGoToBuy = jest.fn();

jest.mock('../../../UI/Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({ goToBuy: mockGoToBuy }),
}));

jest.mock('../utils/getRelatedAssetImageSource', () => ({
  getRelatedAssetImageSource: jest.fn(() => undefined),
}));

const btcAsset: RelatedAsset = {
  sourceAssetId: 'bitcoin',
  symbol: 'BTC',
  name: 'Bitcoin',
  caip19: ['eip155:1/slip44:0'],
};

const perpsOnlyAsset: RelatedAsset = {
  sourceAssetId: 'tsla',
  symbol: 'TSLA',
  name: 'Tesla',
  caip19: [],
  hlPerpsMarket: ['xyz:TSLA'],
};

describe('TokenRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the asset symbol', () => {
    renderWithProvider(<TokenRow asset={btcAsset} />);
    expect(screen.getByText('BTC')).toBeOnTheScreen();
  });

  it('renders the Buy button', () => {
    renderWithProvider(<TokenRow asset={btcAsset} />);
    expect(screen.getByText('Buy')).toBeOnTheScreen();
  });

  it('calls goToBuy with the first caip19 identifier on Buy press', () => {
    renderWithProvider(<TokenRow asset={btcAsset} />);
    fireEvent.press(screen.getByText('Buy'));
    expect(mockGoToBuy).toHaveBeenCalledWith({
      assetId: 'eip155:1/slip44:0',
    });
  });

  it('calls goToBuy with assetId undefined when caip19 is empty', () => {
    renderWithProvider(<TokenRow asset={perpsOnlyAsset} />);
    fireEvent.press(screen.getByText('Buy'));
    expect(mockGoToBuy).toHaveBeenCalledWith({ assetId: undefined });
  });
});
