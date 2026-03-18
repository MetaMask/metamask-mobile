import React, { createRef } from 'react';
import { screen, fireEvent, act } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import NFTsSection from './NFTsSection';
import Routes from '../../../../../constants/navigation/Routes';
import { SectionRefreshHandle } from '../../types';

const mockNavigate = jest.fn();
const mockOnRefresh = jest.fn().mockResolvedValue(undefined);
const mockDetectNfts = jest.fn().mockResolvedValue(undefined);
const mockAbortDetection = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
    useFocusEffect: (callback: () => void) => {
      const React = jest.requireActual('react');
      React.useEffect(callback, [callback]);
    },
  };
});

jest.mock('../../../../../reducers/collectibles', () => ({
  isNftFetchingProgressSelector: jest.fn(() => false),
}));

jest.mock('../../../../hooks/useNftDetection', () => ({
  useNftDetection: () => ({
    detectNfts: mockDetectNfts,
    abortDetection: mockAbortDetection,
    chainIdsToDetectNftsFor: [],
  }),
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

jest.mock('../../hooks/useHomeViewedEvent', () => ({
  __esModule: true,
  default: jest.fn(() => ({ onLayout: jest.fn() })),
  HomeSectionNames: {
    TOKENS: 'tokens',
    PERPS: 'perps',
    DEFI: 'defi',
    PREDICT: 'predict',
    NFTS: 'nfts',
  },
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

    renderWithProvider(
      <NFTsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('NFTs')).toBeOnTheScreen();
    // Empty state and NFT grid should not be visible during loading
    expect(screen.queryByText('Import NFTs')).not.toBeOnTheScreen();
  });

  it('renders empty state when user has no NFTs', () => {
    renderWithProvider(
      <NFTsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('NFTs')).toBeOnTheScreen();
    expect(screen.getByText('Import NFTs')).toBeOnTheScreen();
  });

  it('navigates to AddAsset when import NFTs card is pressed', () => {
    renderWithProvider(
      <NFTsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    fireEvent.press(screen.getByText('Import NFTs'));

    expect(mockNavigate).toHaveBeenCalledWith('AddAsset', {
      assetType: 'collectible',
    });
  });

  it('renders section title when user has NFTs', () => {
    jest
      .requireMock('./hooks')
      .useOwnedNfts.mockReturnValue([mockNft('0x123', '1')]);

    renderWithProvider(
      <NFTsSection sectionIndex={0} totalSectionsLoaded={1} />,
      { state: stateWithNftPreferences },
    );

    expect(screen.getByText('NFTs')).toBeOnTheScreen();
  });

  it('navigates to NFTs full view on title press', () => {
    jest
      .requireMock('./hooks')
      .useOwnedNfts.mockReturnValue([mockNft('0x123', '1')]);

    renderWithProvider(
      <NFTsSection sectionIndex={0} totalSectionsLoaded={1} />,
      { state: stateWithNftPreferences },
    );

    fireEvent.press(screen.getByText('NFTs'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.NFTS_FULL_VIEW);
  });

  it('displays up to 6 NFTs and excludes extras beyond the limit', () => {
    const nfts = Array.from({ length: 8 }, (__, i) =>
      mockNft(`0x${i}`, `${i}`),
    );
    jest.requireMock('./hooks').useOwnedNfts.mockReturnValue(nfts);

    renderWithProvider(
      <NFTsSection sectionIndex={0} totalSectionsLoaded={1} />,
      { state: stateWithNftPreferences },
    );

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

  it('triggers NFT detection on focus', () => {
    renderWithProvider(
      <NFTsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(mockDetectNfts).toHaveBeenCalledTimes(1);
  });

  it('calls abortDetection on unmount', () => {
    const { unmount } = renderWithProvider(
      <NFTsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    unmount();

    expect(mockAbortDetection).toHaveBeenCalledTimes(1);
  });

  it('renders without error when detectNfts rejects', async () => {
    mockDetectNfts.mockRejectedValueOnce(new Error('Aborted'));

    renderWithProvider(
      <NFTsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    await act(async () => undefined);

    expect(screen.getByText('NFTs')).toBeOnTheScreen();
  });

  it('exposes refresh function via ref that calls useNftRefresh.onRefresh', async () => {
    const ref = createRef<SectionRefreshHandle>();

    renderWithProvider(
      <NFTsSection ref={ref} sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.refresh).toBe('function');

    await act(async () => {
      await ref.current?.refresh();
    });

    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });
});
