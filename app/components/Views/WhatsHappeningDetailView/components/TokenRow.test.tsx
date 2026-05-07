import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TokenRow from './TokenRow';
import type { RelatedAsset } from '@metamask/ai-controllers';
import Routes from '../../../../constants/navigation/Routes';

const mockGoToBuy = jest.fn();
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

describe('TokenRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when asset has only caip19 (no hlPerpsMarket)', () => {
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
  });

  describe('when asset has hlPerpsMarket (dual asset)', () => {
    it('renders the Trade button instead of Buy', () => {
      renderWithProvider(<TokenRow asset={dualAsset} />);
      expect(screen.getByText('Trade')).toBeOnTheScreen();
      expect(screen.queryByText('Buy')).toBeNull();
    });

    it('navigates to Perps market details on Trade press', () => {
      renderWithProvider(<TokenRow asset={dualAsset} />);
      fireEvent.press(screen.getByText('Trade'));
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: expect.objectContaining({
          market: { symbol: 'ETH', name: 'Ethereum' },
        }),
      });
    });

    it('does not call goToBuy when Trade is pressed', () => {
      renderWithProvider(<TokenRow asset={dualAsset} />);
      fireEvent.press(screen.getByText('Trade'));
      expect(mockGoToBuy).not.toHaveBeenCalled();
    });
  });
});
