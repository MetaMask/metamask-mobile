import React, { createRef } from 'react';
import { screen, fireEvent, act } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import NFTsSection from './NFTsSection';
import Routes from '../../../../../constants/navigation/Routes';
import { SectionRefreshHandle } from '../../types';

const mockNavigate = jest.fn();
const mockOnRefresh = jest.fn().mockResolvedValue(undefined);

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../../../reducers/collectibles', () => ({
  isNftFetchingProgressSelector: jest.fn(() => false),
}));

jest.mock('../../../../UI/NftGrid/useNftRefresh', () => ({
  useNftRefresh: () => ({
    refreshing: false,
    onRefresh: mockOnRefresh,
  }),
}));

const mockNft = (address: string, tokenId: string) => ({
  address,
  tokenId,
  isCurrentlyOwned: true,
  name: `NFT ${tokenId}`,
  image: 'https://example.com/nft.png',
});

jest.mock('./hooks', () => ({
  useOwnedNfts: jest.fn(() => []),
}));

// State with preferences needed for NftGridItem/CollectibleMedia
const stateWithNftPreferences = {
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        ...backgroundState.PreferencesController,
        isIpfsGatewayEnabled: true,
        displayNftMedia: true,
      },
    },
  },
};

describe('NFTsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock return values to defaults to ensure test isolation
    jest.requireMock('./hooks').useOwnedNfts.mockReturnValue([]);
    jest
      .requireMock('../../../../../reducers/collectibles')
      .isNftFetchingProgressSelector.mockReturnValue(false);
    mockOnRefresh.mockClear();
  });

  it('renders skeleton loading state when NFTs are being fetched', () => {
    jest
      .requireMock('../../../../../reducers/collectibles')
      .isNftFetchingProgressSelector.mockReturnValue(true);

    renderWithProvider(<NFTsSection />);

    expect(screen.getByText('NFTs')).toBeOnTheScreen();
    // Empty state and NFT grid should not be visible during loading
    expect(screen.queryByText('Import NFTs')).not.toBeOnTheScreen();
  });

  it('renders empty state card when user has no NFTs', () => {
    renderWithProvider(<NFTsSection />);

    expect(screen.getByText('NFTs')).toBeOnTheScreen();
    expect(screen.getByText('Import NFTs')).toBeOnTheScreen();
    expect(screen.getByText('Easily add your collectibles')).toBeOnTheScreen();
  });

  it('navigates to AddAsset when import NFTs card is pressed', () => {
    renderWithProvider(<NFTsSection />);

    fireEvent.press(screen.getByText('Import NFTs'));

    expect(mockNavigate).toHaveBeenCalledWith('AddAsset', {
      assetType: 'collectible',
    });
  });

  it('renders section title when user has NFTs', () => {
    jest
      .requireMock('./hooks')
      .useOwnedNfts.mockReturnValue([mockNft('0x123', '1')]);

    renderWithProvider(<NFTsSection />, { state: stateWithNftPreferences });

    expect(screen.getByText('NFTs')).toBeOnTheScreen();
  });

  it('navigates to NFTs full view on title press', () => {
    jest
      .requireMock('./hooks')
      .useOwnedNfts.mockReturnValue([mockNft('0x123', '1')]);

    renderWithProvider(<NFTsSection />, { state: stateWithNftPreferences });

    fireEvent.press(screen.getByText('NFTs'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.NFTS_FULL_VIEW);
  });

  it('displays up to 6 NFTs and excludes extras beyond the limit', () => {
    const nfts = Array.from({ length: 8 }, (__, i) =>
      mockNft(`0x${i}`, `${i}`),
    );
    jest.requireMock('./hooks').useOwnedNfts.mockReturnValue(nfts);

    renderWithProvider(<NFTsSection />, { state: stateWithNftPreferences });

    // First 6 NFTs (indices 0-5) should be displayed
    expect(screen.getByText('NFT 0')).toBeOnTheScreen();
    expect(screen.getByText('NFT 1')).toBeOnTheScreen();
    expect(screen.getByText('NFT 2')).toBeOnTheScreen();
    expect(screen.getByText('NFT 3')).toBeOnTheScreen();
    expect(screen.getByText('NFT 4')).toBeOnTheScreen();
    expect(screen.getByText('NFT 5')).toBeOnTheScreen();

    // NFTs beyond the limit (indices 6-7) should NOT be displayed
    expect(screen.queryByText('NFT 6')).not.toBeOnTheScreen();
    expect(screen.queryByText('NFT 7')).not.toBeOnTheScreen();
  });

  it('exposes refresh function via ref that calls useNftRefresh.onRefresh', async () => {
    const ref = createRef<SectionRefreshHandle>();

    renderWithProvider(<NFTsSection ref={ref} />);

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.refresh).toBe('function');

    await act(async () => {
      await ref.current?.refresh();
    });

    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });
});
