import type { Nft } from '@metamask/assets-controllers';
import React, { createRef } from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import Homepage from './Homepage';
import { SectionRefreshHandle } from './types';

// Mock navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
    useFocusEffect: (callback: () => void) => {
      const ReactLib = jest.requireActual('react');
      ReactLib.useEffect(callback, [callback]);
    },
  };
});

const mockUseABTest = jest.fn(() => ({
  variant: { separateTrending: false },
}));
jest.mock('../../../hooks', () => ({
  useABTest: (...args: unknown[]) =>
    Reflect.apply(mockUseABTest, undefined, args),
}));

const mockUseOwnedNfts = jest.fn((): Nft[] => []);
jest.mock('./Sections/NFTs/hooks', () => ({
  useOwnedNfts: () => mockUseOwnedNfts(),
}));

// Mock feature flags - enable all sections by default
const mockDetectNfts = jest.fn().mockResolvedValue(undefined);
const mockAbortDetection = jest.fn();

jest.mock('../../hooks/useNftDetection', () => ({
  useNftDetection: () => ({
    detectNfts: mockDetectNfts,
    abortDetection: mockAbortDetection,
    chainIdsToDetectNftsFor: [],
  }),
}));

// Mock feature flags - enable all sections
jest.mock('../../UI/Perps', () => ({
  selectPerpsEnabledFlag: jest.fn(() => true),
}));

jest.mock('../../UI/Perps/providers/PerpsConnectionProvider', () => ({
  PerpsConnectionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('../../UI/Perps/providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  usePerpsStream: jest.fn(() => ({
    candles: { subscribe: jest.fn(() => jest.fn()) },
  })),
}));

jest.mock('../../UI/Perps/hooks', () => ({
  usePerpsLivePositions: jest.fn(() => ({
    positions: [],
    isInitialLoading: false,
  })),
  usePerpsLiveOrders: jest.fn(() => ({
    orders: [],
    isInitialLoading: false,
  })),
  usePerpsLiveAccount: jest.fn(() => ({
    account: {
      unrealizedPnl: '0',
      returnOnEquity: '0',
    },
    isInitialLoading: false,
  })),
  usePerpsMarkets: jest.fn(() => ({
    markets: [],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
    isRefreshing: false,
  })),
}));

jest.mock('../../UI/Perps/hooks/usePerpsConnection', () => ({
  usePerpsConnection: jest.fn(() => ({
    isConnected: true,
    isConnecting: false,
    isInitialized: true,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    resetError: jest.fn(),
    reconnectWithNewContext: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock(
  '../Homepage/Sections/Perpetuals/hooks/useHomepageSparklines',
  () => ({
    useHomepageSparklines: jest.fn(() => ({
      sparklines: {},
      refresh: jest.fn(),
    })),
  }),
);

jest.mock('react-native-skeleton-placeholder', () => {
  const { View } = jest.requireActual('react-native');
  const MockSkeletonPlaceholder = ({
    children,
  }: {
    children: React.ReactNode;
  }) => <View testID="skeleton-placeholder">{children}</View>;
  MockSkeletonPlaceholder.Item = (props: Record<string, unknown>) => (
    <View {...props} />
  );
  return MockSkeletonPlaceholder;
});

jest.mock('../../UI/Predict/selectors/featureFlags', () => ({
  selectPredictEnabledFlag: jest.fn(() => true),
}));

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: jest.fn(() => ({
      invalidateQueries: jest.fn(() => Promise.resolve()),
    })),
  };
});

jest.mock('../../UI/Predict/hooks/useUnrealizedPnL', () => ({
  useUnrealizedPnL: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
}));

jest.mock('../../UI/Predict/hooks/usePredictPositions', () => ({
  usePredictPositions: () => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../UI/Predict/hooks/usePredictMarketData', () => ({
  usePredictMarketData: () => ({
    marketData: [],
    isFetching: false,
    isFetchingMore: false,
    error: null,
    hasMore: false,
    refetch: jest.fn().mockResolvedValue(undefined),
    fetchMore: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock(
  '../../../selectors/featureFlagController/assetsDefiPositions',
  () => ({
    selectAssetsDefiPositionsEnabled: jest.fn(() => true),
  }),
);

jest.mock('../../../selectors/featureFlagController/whatsHappening', () => ({
  selectWhatsHappeningEnabled: jest.fn(() => false),
}));

jest.mock('../../../selectors/featureFlagController/socialLeaderboard', () => ({
  selectSocialLeaderboardEnabled: jest.fn(() => false),
}));

/** Shape of first argument to useHomeViewedEvent (for asserting in tests). */
interface UseHomeViewedEventParamsSnapshot {
  sectionName?: string;
  sectionIndex?: number;
  totalSectionsLoaded?: number;
}

// Mock useHomeViewedEvent to avoid analytics side-effects in
// Homepage-level tests — section-level analytics are covered by the hook tests.
const mockUseHomeViewedEvent = jest.fn(() => ({ onLayout: jest.fn() }));
jest.mock('./hooks/useHomeViewedEvent', () => ({
  __esModule: true,
  default: (params: UseHomeViewedEventParamsSnapshot) =>
    (mockUseHomeViewedEvent as jest.Mock)(params),
  HomeSectionNames: {
    CASH: 'cash',
    TOKENS: 'tokens',
    TOP_TRADERS: 'top_traders',
    WHATS_HAPPENING: 'whats_happening',
    PERPS: 'perps',
    DEFI: 'defi',
    PREDICT: 'predict',
    NFTS: 'nfts',
    TRENDING_TOKENS: 'trending_tokens',
    TRENDING_PERPS: 'trending_perps',
    TRENDING_PREDICT: 'trending_predict',
  },
}));

/** Returns mock useHomeViewedEvent calls with typed first argument. */
function getUseHomeViewedEventCalls(): [UseHomeViewedEventParamsSnapshot][] {
  return mockUseHomeViewedEvent.mock.calls as unknown as [
    UseHomeViewedEventParamsSnapshot,
  ][];
}

jest.mock('../../UI/Earn/selectors/featureFlags', () => ({
  selectIsMusdConversionFlowEnabledFlag: jest.fn(() => false),
  selectPooledStakingEnabledFlag: jest.fn(() => false),
  selectStablecoinLendingEnabledFlag: jest.fn(() => false),
  selectIsMusdGetBuyCtaEnabledFlag: jest.fn(() => false),
  selectMusdConversionCTATokens: jest.fn(() => ({})),
  selectIsMusdConversionTokenListItemCtaEnabledFlag: jest.fn(() => false),
  selectIsMusdConversionAssetOverviewEnabledFlag: jest.fn(() => false),
  selectMusdQuickConvertEnabledFlag: jest.fn(() => false),
  selectMerklCampaignClaimingEnabledFlag: jest.fn(() => false),
}));

const mockUseMusdConversionEligibility = jest.fn(() => ({ isEligible: false }));
jest.mock('../../UI/Earn/hooks/useMusdConversionEligibility', () => ({
  useMusdConversionEligibility: () => mockUseMusdConversionEligibility(),
}));

const mockUseMusdConversionTokens = jest.fn(() => ({
  tokens: [],
  filterAllowedTokens: (tokens: unknown[]) => tokens,
  isConversionToken: () => false,
  isMusdSupportedOnChain: () => false,
  hasConvertibleTokensByChainId: () => false,
}));
jest.mock('../../UI/Earn/hooks/useMusdConversionTokens', () => ({
  useMusdConversionTokens: () => mockUseMusdConversionTokens(),
}));

const mockEnableAllPopularNetworks = jest.fn();
jest.mock('../../hooks/useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: () => ({
    namespace: 'eip155',
    enabledNetworksByNamespace: {},
    enabledNetworksForCurrentNamespace: {},
    enabledNetworksForAllNamespaces: {},
    networkEnablementController: {},
    enableNetwork: jest.fn(),
    disableNetwork: jest.fn(),
    enableAllPopularNetworks: mockEnableAllPopularNetworks,
    popularEvmNetworks: [],
    popularMultichainNetworks: [],
    popularNetworks: [],
    isNetworkEnabled: jest.fn(),
    hasOneEnabledNetwork: false,
    tryEnableEvmNetwork: jest.fn(),
  }),
}));

// State with preferences needed for NFT section rendering
const stateWithPreferences = {
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

describe('Homepage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .requireMock('../../UI/Perps')
      .selectPerpsEnabledFlag.mockReturnValue(true);
    jest
      .requireMock('../../UI/Predict/selectors/featureFlags')
      .selectPredictEnabledFlag.mockReturnValue(true);
    jest
      .requireMock(
        '../../../selectors/featureFlagController/assetsDefiPositions',
      )
      .selectAssetsDefiPositionsEnabled.mockReturnValue(true);
    jest
      .requireMock('../../../selectors/featureFlagController/whatsHappening')
      .selectWhatsHappeningEnabled.mockReturnValue(false);
    jest
      .requireMock('../../../selectors/featureFlagController/socialLeaderboard')
      .selectSocialLeaderboardEnabled.mockReturnValue(false);
    jest
      .requireMock('../../UI/Earn/selectors/featureFlags')
      .selectIsMusdConversionFlowEnabledFlag.mockReturnValue(false);
    mockUseMusdConversionEligibility.mockReturnValue({ isEligible: false });
    mockUseABTest.mockReturnValue({ variant: { separateTrending: false } });
    mockUseOwnedNfts.mockReturnValue([]);
  });

  it('calls enableAllPopularNetworks when Homepage is focused (useFocusEffect)', () => {
    renderWithProvider(<Homepage />, { state: stateWithPreferences });

    expect(mockEnableAllPopularNetworks).toHaveBeenCalled();
  });

  it('renders NFTs section title', () => {
    renderWithProvider(<Homepage />, { state: stateWithPreferences });

    expect(screen.getByText('NFTs')).toBeOnTheScreen();
  });

  it('renders NFTs section empty state when user has no NFTs', () => {
    renderWithProvider(<Homepage />, { state: stateWithPreferences });

    expect(screen.getByText('Import NFTs')).toBeOnTheScreen();
  });

  it('exposes refresh function via ref', () => {
    const ref = createRef<SectionRefreshHandle>();

    renderWithProvider(<Homepage ref={ref} />, { state: stateWithPreferences });

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.refresh).toBe('function');
  });

  it('refresh function returns a resolved promise', async () => {
    const ref = createRef<SectionRefreshHandle>();
    renderWithProvider(<Homepage ref={ref} />, { state: stateWithPreferences });

    const result = ref.current?.refresh();

    await expect(result).resolves.toBeUndefined();
  });

  describe('section indices — all flags enabled', () => {
    it('passes correct sectionIndex to each section when all flags are on', () => {
      renderWithProvider(<Homepage />, { state: stateWithPreferences });

      // Tokens=0, Perps=1, Predict=2, DeFi=3, NFTs=4 → total=5
      const calls = getUseHomeViewedEventCalls();
      const callBySectionName = (name: string) =>
        calls.find((c) => c[0]?.sectionName === name)?.[0];

      expect(callBySectionName('tokens')?.sectionIndex).toBe(0);
      expect(callBySectionName('perps')?.sectionIndex).toBe(1);
      expect(callBySectionName('predict')?.sectionIndex).toBe(2);
      expect(callBySectionName('defi')?.sectionIndex).toBe(3);
      expect(callBySectionName('nfts')?.sectionIndex).toBe(4);
    });

    it('passes totalSectionsLoaded=5 when all flags are enabled', () => {
      renderWithProvider(<Homepage />, { state: stateWithPreferences });

      const calls = getUseHomeViewedEventCalls();
      calls.forEach((call) => {
        expect(call[0]?.totalSectionsLoaded).toBe(5);
      });
    });
  });

  describe('section indices — Perps disabled', () => {
    beforeEach(() => {
      jest
        .requireMock('../../UI/Perps')
        .selectPerpsEnabledFlag.mockReturnValue(false);
    });

    it('shifts indices when Perps is disabled', () => {
      renderWithProvider(<Homepage />, { state: stateWithPreferences });

      const calls = getUseHomeViewedEventCalls();
      const callBySectionName = (name: string) =>
        calls.find((c) => c[0]?.sectionName === name)?.[0];

      expect(callBySectionName('tokens')?.sectionIndex).toBe(0);
      expect(callBySectionName('predict')?.sectionIndex).toBe(1);
      expect(callBySectionName('defi')?.sectionIndex).toBe(2);
      expect(callBySectionName('nfts')?.sectionIndex).toBe(3);
    });

    it('passes totalSectionsLoaded=4 when Perps is disabled', () => {
      renderWithProvider(<Homepage />, { state: stateWithPreferences });

      const calls = getUseHomeViewedEventCalls();
      calls.forEach((call) => {
        expect(call[0]?.totalSectionsLoaded).toBe(4);
      });
    });
  });

  describe('section indices — all optional flags disabled', () => {
    beforeEach(() => {
      jest
        .requireMock('../../UI/Perps')
        .selectPerpsEnabledFlag.mockReturnValue(false);
      jest
        .requireMock('../../UI/Predict/selectors/featureFlags')
        .selectPredictEnabledFlag.mockReturnValue(false);
      jest
        .requireMock(
          '../../../selectors/featureFlagController/assetsDefiPositions',
        )
        .selectAssetsDefiPositionsEnabled.mockReturnValue(false);
    });

    it('passes totalSectionsLoaded=2 when only Tokens and NFTs are enabled', () => {
      renderWithProvider(<Homepage />, { state: stateWithPreferences });

      const calls = getUseHomeViewedEventCalls();
      const callBySectionName = (name: string) =>
        calls.find((c) => c[0]?.sectionName === name)?.[0];

      expect(callBySectionName('tokens')?.sectionIndex).toBe(0);
      expect(callBySectionName('nfts')?.sectionIndex).toBe(1);
      expect(callBySectionName('tokens')?.totalSectionsLoaded).toBe(2);
    });
  });

  describe("section indices — Social Leaderboard and What's Happening enabled", () => {
    beforeEach(() => {
      jest
        .requireMock('../../../selectors/featureFlagController/whatsHappening')
        .selectWhatsHappeningEnabled.mockReturnValue(true);
      jest
        .requireMock(
          '../../../selectors/featureFlagController/socialLeaderboard',
        )
        .selectSocialLeaderboardEnabled.mockReturnValue(true);
    });

    it('passes correct sectionIndex including top_traders and shifts following sections', () => {
      renderWithProvider(<Homepage />, { state: stateWithPreferences });

      const calls = getUseHomeViewedEventCalls();
      const callBySectionName = (name: string) =>
        calls.find((c) => c[0]?.sectionName === name)?.[0];

      expect(callBySectionName('tokens')?.sectionIndex).toBe(0);
      expect(callBySectionName('top_traders')?.sectionIndex).toBe(1);
      expect(callBySectionName('perps')?.sectionIndex).toBe(2);
      expect(callBySectionName('predict')?.sectionIndex).toBe(3);
      expect(callBySectionName('whats_happening')?.sectionIndex).toBe(4);
      expect(callBySectionName('defi')?.sectionIndex).toBe(5);
      expect(callBySectionName('nfts')?.sectionIndex).toBe(6);
    });

    it("passes totalSectionsLoaded=7 when leaderboard and What's Happening flags are on", () => {
      renderWithProvider(<Homepage />, { state: stateWithPreferences });

      const calls = getUseHomeViewedEventCalls();
      calls.forEach((call) => {
        expect(call[0]?.totalSectionsLoaded).toBe(7);
      });
    });
  });

  describe('section indices — Cash section enabled', () => {
    beforeEach(() => {
      jest
        .requireMock('../../UI/Earn/selectors/featureFlags')
        .selectIsMusdConversionFlowEnabledFlag.mockReturnValue(true);
      mockUseMusdConversionEligibility.mockReturnValue({ isEligible: true });
    });

    it('passes sectionIndex 0 to Cash and shifts others when Cash is enabled', () => {
      renderWithProvider(<Homepage />, { state: stateWithPreferences });

      const calls = getUseHomeViewedEventCalls();
      const callBySectionName = (name: string) =>
        calls.find((c) => c[0]?.sectionName === name)?.[0];

      expect(callBySectionName('cash')?.sectionIndex).toBe(0);
      expect(callBySectionName('tokens')?.sectionIndex).toBe(1);
      expect(callBySectionName('perps')?.sectionIndex).toBe(2);
      expect(callBySectionName('nfts')?.sectionIndex).toBe(5);
      expect(callBySectionName('cash')?.totalSectionsLoaded).toBe(6);
    });
  });

  describe('treatment variant — separateTrending enabled', () => {
    beforeEach(() => {
      mockUseABTest.mockReturnValue({ variant: { separateTrending: true } });
    });

    it('passes correct section indices when separateTrending is active (no NFTs)', () => {
      renderWithProvider(<Homepage />, { state: stateWithPreferences });

      const calls = getUseHomeViewedEventCalls();
      const callBySectionName = (name: string) =>
        calls.find((c) => c[0]?.sectionName === name)?.[0];

      expect(callBySectionName('tokens')?.sectionIndex).toBe(0);
      expect(callBySectionName('perps')?.sectionIndex).toBe(1);
      expect(callBySectionName('predict')?.sectionIndex).toBe(2);
      expect(callBySectionName('defi')?.sectionIndex).toBe(3);
      expect(callBySectionName('trending_tokens')?.sectionIndex).toBe(4);
      expect(callBySectionName('trending_perps')?.sectionIndex).toBe(5);
      expect(callBySectionName('trending_predict')?.sectionIndex).toBe(6);
      expect(callBySectionName('nfts')?.sectionIndex).toBe(7);

      calls.forEach((call) => {
        expect(call[0]?.totalSectionsLoaded).toBe(8);
      });
    });

    it('places NFTs above trending sections when user has NFTs', () => {
      mockUseOwnedNfts.mockReturnValue([{ tokenId: '1' } as Nft]);
      renderWithProvider(<Homepage />, { state: stateWithPreferences });

      const calls = getUseHomeViewedEventCalls();
      const callBySectionName = (name: string) =>
        calls.find((c) => c[0]?.sectionName === name)?.[0];

      expect(callBySectionName('tokens')?.sectionIndex).toBe(0);
      expect(callBySectionName('perps')?.sectionIndex).toBe(1);
      expect(callBySectionName('predict')?.sectionIndex).toBe(2);
      expect(callBySectionName('defi')?.sectionIndex).toBe(3);
      expect(callBySectionName('nfts')?.sectionIndex).toBe(4);
      expect(callBySectionName('trending_tokens')?.sectionIndex).toBe(5);
      expect(callBySectionName('trending_perps')?.sectionIndex).toBe(6);
      expect(callBySectionName('trending_predict')?.sectionIndex).toBe(7);

      calls.forEach((call) => {
        expect(call[0]?.totalSectionsLoaded).toBe(8);
      });
    });

    it('excludes trending_perps when Perps is disabled', () => {
      jest
        .requireMock('../../UI/Perps')
        .selectPerpsEnabledFlag.mockReturnValue(false);

      renderWithProvider(<Homepage />, { state: stateWithPreferences });

      const calls = getUseHomeViewedEventCalls();
      const callBySectionName = (name: string) =>
        calls.find((c) => c[0]?.sectionName === name)?.[0];

      expect(callBySectionName('tokens')?.sectionIndex).toBe(0);
      expect(callBySectionName('predict')?.sectionIndex).toBe(1);
      expect(callBySectionName('defi')?.sectionIndex).toBe(2);
      expect(callBySectionName('trending_tokens')?.sectionIndex).toBe(3);
      expect(callBySectionName('trending_predict')?.sectionIndex).toBe(4);
      expect(callBySectionName('nfts')?.sectionIndex).toBe(5);

      expect(calls.some((c) => c[0]?.sectionName === 'perps')).toBe(false);
      expect(calls.some((c) => c[0]?.sectionName === 'trending_perps')).toBe(
        false,
      );

      calls.forEach((call) => {
        expect(call[0]?.totalSectionsLoaded).toBe(6);
      });
    });

    it('includes whats_happening section in treatment variant', () => {
      renderWithProvider(<Homepage />, { state: stateWithPreferences });

      const calls = getUseHomeViewedEventCalls();
      expect(calls.some((c) => c[0]?.sectionName === 'whats_happening')).toBe(
        true,
      );
    });
  });
});
