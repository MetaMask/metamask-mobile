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

let mockIsVisible = false;
const mockOnViewportLayout = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
    useFocusEffect: (callback: () => void) => {
      const ReactLib = jest.requireActual('react');
      ReactLib.useEffect(callback, [callback]);
    },
  };
});

jest.mock('../../../../UI/NftGrid/useNftRefresh', () => ({
  useNftRefresh: () => ({
    refreshing: false,
    onRefresh: mockOnRefresh,
  }),
}));

jest.mock('../../../../hooks/useNftDetection', () => ({
  useNftDetection: () => ({
    detectNfts: mockDetectNfts,
    abortDetection: mockAbortDetection,
    chainIdsToDetectNftsFor: [],
  }),
}));

jest.mock('../../hooks/useSectionViewportVisible', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isVisible: mockIsVisible,
    onLayout: mockOnViewportLayout,
  })),
}));

let mockVisitId = 0;
jest.mock('../../context/HomepageScrollContext', () => ({
  useHomepageScrollContext: () => ({
    visitId: mockVisitId,
    subscribeToScroll: jest.fn(() => jest.fn()),
    viewportHeight: 800,
    containerScreenY: 0,
    entryPoint: 'app_opened',
    notifySectionViewed: jest.fn(),
    getViewedSectionCount: jest.fn(() => 0),
    getVisitMaxDepth: jest.fn(() => -1),
    appSessionId: 'test-session',
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

jest.mock('../../../../UI/NftGrid/NftGridItemBottomSheet', () => {
  const { View } = jest.requireActual('react-native');
  return ({ isVisible }: { isVisible: boolean }) =>
    isVisible ? <View testID="nft-grid-item-bottom-sheet" /> : null;
});

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

jest.mock('../../../../UI/NftGrid/NftSkeletonCell', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="nft-skeleton-cell" />;
});

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

const stateWhileDetecting = {
  ...stateWithNftPreferences,
  collectibles: { isNftFetchingProgress: true },
};

describe('NFTsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock return values to defaults to ensure test isolation
    jest.requireMock('./hooks').useOwnedNfts.mockReturnValue([]);
    mockDetectNfts.mockResolvedValue(undefined);
    mockIsVisible = false;
    mockVisitId = 0;
    jest
      .requireMock('../../hooks/useSectionViewportVisible')
      .default.mockImplementation(() => ({
        isVisible: mockIsVisible,
        onLayout: mockOnViewportLayout,
      }));
  });

  it('shows 3 skeleton cells before detection has ever run (section must be mounted for visibility to be detected)', () => {
    // Before detection runs, the section must render a non-zero-height View so
    // useSectionViewportVisible can measure it. Skeletons provide that height.
    renderWithProvider(
      <NFTsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('NFTs')).toBeOnTheScreen();
    expect(screen.getAllByTestId('nft-skeleton-cell')).toHaveLength(3);
  });

  it('shows 3 skeleton cells while detection is in progress with no NFTs', () => {
    renderWithProvider(
      <NFTsSection sectionIndex={0} totalSectionsLoaded={1} />,
      { state: stateWhileDetecting },
    );

    expect(screen.getByText('NFTs')).toBeOnTheScreen();
    expect(screen.getAllByTestId('nft-skeleton-cell')).toHaveLength(3);
  });

  it('hides the section after detection completes with no NFTs', () => {
    // Simulate: section is visible, detection fires and sets hasDetected=true,
    // then detection finishes with no NFTs → section should hide.
    jest
      .requireMock('../../hooks/useSectionViewportVisible')
      .default.mockReturnValue({
        isVisible: true,
        onLayout: mockOnViewportLayout,
      });

    renderWithProvider(
      <NFTsSection sectionIndex={0} totalSectionsLoaded={1} />,
      { state: stateWithNftPreferences }, // isNftFetchingProgress=false, detectNfts already fired
    );

    // After detectNfts fires (hasDetected=true) and isDetecting=false with no NFTs → null
    expect(screen.queryByText('NFTs')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('nft-skeleton-cell')).not.toBeOnTheScreen();
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

  it('opens bottom sheet when an NFT item is long-pressed', () => {
    jest
      .requireMock('./hooks')
      .useOwnedNfts.mockReturnValue([mockNft('0x123', '1')]);

    renderWithProvider(
      <NFTsSection sectionIndex={0} totalSectionsLoaded={1} />,
      { state: stateWithNftPreferences },
    );

    expect(screen.queryByTestId('nft-grid-item-bottom-sheet')).toBeNull();

    fireEvent(screen.getByTestId('collectible-NFT 1-1'), 'longPress');

    expect(screen.getByTestId('nft-grid-item-bottom-sheet')).toBeOnTheScreen();
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

  describe('viewport-gated NFT detection', () => {
    const nftForDetection = mockNft('0x123', '1');

    it('calls detectNfts when user has no NFTs and section scrolls into viewport', () => {
      jest
        .requireMock('../../hooks/useSectionViewportVisible')
        .default.mockReturnValue({
          isVisible: true,
          onLayout: mockOnViewportLayout,
        });

      renderWithProvider(
        <NFTsSection sectionIndex={0} totalSectionsLoaded={1} />,
        { state: stateWhileDetecting },
      );

      expect(mockDetectNfts).toHaveBeenCalledWith(true, false);
    });

    it('does not call detectNfts when section is not visible in viewport', () => {
      jest
        .requireMock('./hooks')
        .useOwnedNfts.mockReturnValue([nftForDetection]);
      // isVisible = false (default)
      renderWithProvider(
        <NFTsSection sectionIndex={0} totalSectionsLoaded={1} />,
        { state: stateWithNftPreferences },
      );

      expect(mockDetectNfts).not.toHaveBeenCalled();
    });

    it('calls detectNfts when section scrolls into viewport', () => {
      jest
        .requireMock('./hooks')
        .useOwnedNfts.mockReturnValue([nftForDetection]);
      jest
        .requireMock('../../hooks/useSectionViewportVisible')
        .default.mockReturnValue({
          isVisible: true,
          onLayout: mockOnViewportLayout,
        });

      renderWithProvider(
        <NFTsSection sectionIndex={0} totalSectionsLoaded={1} />,
        { state: stateWithNftPreferences },
      );

      expect(mockDetectNfts).toHaveBeenCalledWith(true, false);
    });

    it('does not abort detection when section leaves viewport or unmounts', () => {
      jest
        .requireMock('./hooks')
        .useOwnedNfts.mockReturnValue([nftForDetection]);
      jest
        .requireMock('../../hooks/useSectionViewportVisible')
        .default.mockReturnValue({
          isVisible: true,
          onLayout: mockOnViewportLayout,
        });

      const { unmount } = renderWithProvider(
        <NFTsSection sectionIndex={0} totalSectionsLoaded={1} />,
        { state: stateWithNftPreferences },
      );

      unmount();

      expect(mockAbortDetection).not.toHaveBeenCalled();
    });

    it('does not call detectNfts a second time within the throttle window', () => {
      jest
        .requireMock('./hooks')
        .useOwnedNfts.mockReturnValue([nftForDetection]);
      jest
        .requireMock('../../hooks/useSectionViewportVisible')
        .default.mockReturnValue({
          isVisible: true,
          onLayout: mockOnViewportLayout,
        });

      const { rerender } = renderWithProvider(
        <NFTsSection sectionIndex={0} totalSectionsLoaded={1} />,
        { state: stateWithNftPreferences },
      );

      // First call fires on mount (isVisible=true)
      expect(mockDetectNfts).toHaveBeenCalledTimes(1);

      // visitId increments — simulates re-focus
      mockVisitId = 1;
      rerender(<NFTsSection sectionIndex={0} totalSectionsLoaded={1} />);

      // Still only one call — throttle blocks the second
      expect(mockDetectNfts).toHaveBeenCalledTimes(1);
    });

    it('calls detectNfts again when visitId increments after throttle window expires', () => {
      jest.useFakeTimers();
      jest
        .requireMock('./hooks')
        .useOwnedNfts.mockReturnValue([nftForDetection]);
      jest
        .requireMock('../../hooks/useSectionViewportVisible')
        .default.mockReturnValue({
          isVisible: true,
          onLayout: mockOnViewportLayout,
        });

      const { rerender } = renderWithProvider(
        <NFTsSection sectionIndex={0} totalSectionsLoaded={1} />,
        { state: stateWithNftPreferences },
      );

      expect(mockDetectNfts).toHaveBeenCalledTimes(1);

      // Advance time past the 5-minute throttle window
      jest.advanceTimersByTime(300_001);

      // visitId increments — simulates re-focus after throttle has expired
      mockVisitId = 1;
      rerender(<NFTsSection sectionIndex={0} totalSectionsLoaded={1} />);

      expect(mockDetectNfts).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    it('renders without error when detectNfts rejects', async () => {
      jest
        .requireMock('./hooks')
        .useOwnedNfts.mockReturnValue([nftForDetection]);
      mockDetectNfts.mockRejectedValueOnce(new Error('Aborted'));
      jest
        .requireMock('../../hooks/useSectionViewportVisible')
        .default.mockReturnValue({
          isVisible: true,
          onLayout: mockOnViewportLayout,
        });

      renderWithProvider(
        <NFTsSection sectionIndex={0} totalSectionsLoaded={1} />,
        { state: stateWithNftPreferences },
      );

      await act(async () => undefined);

      expect(screen.getByText('NFTs')).toBeOnTheScreen();
    });
  });
});
