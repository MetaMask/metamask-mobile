import React from 'react';
import { merge } from 'lodash';
import { fireEvent } from '@testing-library/react-native';
import { MOCK_ADDRESS_1 } from '../../../../../util/test/accountsControllerTestUtils';
import { MOCK_STATE_NFT } from '../../../../../util/test/mock-data/root-state/nft';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { HeroNft } from './hero-nft';

const mockNft = MOCK_STATE_NFT.engine.backgroundState.NftController.allNfts[
  MOCK_ADDRESS_1.toLowerCase()
]['0x1'].find((nft) => nft.tokenId === '12345');

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../hooks/transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

describe('HeroNft', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const mockTransaction =
      MOCK_STATE_NFT.engine.backgroundState.TransactionController
        .transactions[0];
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      txParams: mockTransaction.txParams,
      chainId: mockTransaction.chainId,
    });
  });

  it('renders placeholder when image is not provided', () => {
    const { getByText, getByTestId, queryAllByText } = renderWithProvider(
      <HeroNft />,
      {
        state: merge({}, MOCK_STATE_NFT, {
          engine: {
            backgroundState: {
              NftController: {
                allNfts: {
                  [MOCK_ADDRESS_1.toLowerCase()]: {
                    '0x1': [
                      {
                        ...mockNft,
                        image: undefined,
                      },
                    ],
                  },
                },
              },
            },
          },
        }),
      },
    );

    expect(getByText('Show')).toBeDefined();
    expect(queryAllByText('#12345')).toHaveLength(2);
    expect(getByTestId('hero-nft-placeholder')).toBeDefined();

    fireEvent.press(getByTestId('hero-nft-placeholder'));
    expect(mockNavigate).toHaveBeenCalledWith('NftDetailsFullImage', {
      collectible: {
        ...mockNft,
        image: undefined,
      },
    });
  });

  it('renders NFT with network badge', () => {
    const { getByTestId, getByText } = renderWithProvider(<HeroNft />, {
      state: MOCK_STATE_NFT,
    });

    expect(getByTestId('nft-image')).toBeDefined();
    expect(getByTestId('network-avatar-image')).toBeDefined();
    expect(getByText('Test Dapp NFTs')).toBeDefined();
    expect(getByText('#12345')).toBeDefined();

    fireEvent.press(getByTestId('nft-image'));
    expect(mockNavigate).toHaveBeenCalledWith('NftDetailsFullImage', {
      collectible: mockNft,
    });
  });
});
