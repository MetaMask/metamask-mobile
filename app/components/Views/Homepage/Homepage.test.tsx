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
  };
});

// Mock feature flags - enable all sections by default
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
  usePerpsMarkets: jest.fn(() => ({
    markets: [],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
    isRefreshing: false,
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
  return function MockSkeletonPlaceholder({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <View testID="skeleton-placeholder">{children}</View>;
  };
});

jest.mock('../../UI/Predict/selectors/featureFlags', () => ({
  selectPredictEnabledFlag: jest.fn(() => true),
}));

jest.mock(
  '../../../selectors/featureFlagController/assetsDefiPositions',
  () => ({
    selectAssetsDefiPositionsEnabled: jest.fn(() => true),
  }),
);

// Mock useHomepageSectionViewedEvent to avoid analytics side-effects in
// Homepage-level tests — section-level analytics are covered by the hook tests.
const mockUseHomepageSectionViewedEvent = jest.fn();
jest.mock('./hooks/useHomepageSectionViewedEvent', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseHomepageSectionViewedEvent(...args),
  HomepageSectionNames: {
    TOKENS: 'tokens',
    PERPS: 'perps',
    DEFI: 'defi',
    PREDICT: 'predict',
    NFTS: 'nfts',
  },
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
  });

  it('renders NFTs section title', () => {
    renderWithProvider(<Homepage />, { state: stateWithPreferences });

    expect(screen.getByText('NFTs')).toBeOnTheScreen();
  });

  it('renders NFTs section empty state when user has no NFTs', () => {
    renderWithProvider(<Homepage />, { state: stateWithPreferences });

    expect(screen.getByText('Import NFTs')).toBeOnTheScreen();
    expect(screen.getByText('Easily add your collectibles')).toBeOnTheScreen();
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
      const calls = mockUseHomepageSectionViewedEvent.mock.calls;
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

      const calls = mockUseHomepageSectionViewedEvent.mock.calls;
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

      const calls = mockUseHomepageSectionViewedEvent.mock.calls;
      const callBySectionName = (name: string) =>
        calls.find((c) => c[0]?.sectionName === name)?.[0];

      expect(callBySectionName('tokens')?.sectionIndex).toBe(0);
      expect(callBySectionName('predict')?.sectionIndex).toBe(1);
      expect(callBySectionName('defi')?.sectionIndex).toBe(2);
      expect(callBySectionName('nfts')?.sectionIndex).toBe(3);
    });

    it('passes totalSectionsLoaded=4 when Perps is disabled', () => {
      renderWithProvider(<Homepage />, { state: stateWithPreferences });

      const calls = mockUseHomepageSectionViewedEvent.mock.calls;
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

      const calls = mockUseHomepageSectionViewedEvent.mock.calls;
      const callBySectionName = (name: string) =>
        calls.find((c) => c[0]?.sectionName === name)?.[0];

      expect(callBySectionName('tokens')?.sectionIndex).toBe(0);
      expect(callBySectionName('nfts')?.sectionIndex).toBe(1);
      expect(callBySectionName('tokens')?.totalSectionsLoaded).toBe(2);
    });
  });
});
