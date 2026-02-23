import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import SnapshotsSection from './SnapshotsSection';
import { useSnapshots } from '../../../../hooks/useSnapshots';
import { strings } from '../../../../../../../../locales/i18n';
import { selectSnapshotsRewardsEnabledFlag } from '../../../../../../../selectors/featureFlagController/rewards';
import type { SnapshotDto } from '../../../../../../../core/Engine/controllers/rewards-controller/types';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock(
  '../../../../../../../selectors/featureFlagController/rewards',
  () => ({
    selectSnapshotsRewardsEnabledFlag: jest.fn(),
  }),
);

jest.mock('../../../../hooks/useSnapshots', () => ({
  useSnapshots: jest.fn(),
}));

jest.mock('../../../../components/SnapshotTile', () => {
  const ReactNative = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    SnapshotTile: jest.fn(({ snapshot }) =>
      ReactActual.createElement(
        ReactNative.View,
        { testID: `snapshot-tile-${snapshot.id}` },
        ReactActual.createElement(ReactNative.Text, null, snapshot.name),
      ),
    ),
    UpcomingSnapshotTileCondensed: jest.fn(({ snapshot }) =>
      ReactActual.createElement(
        ReactNative.View,
        { testID: `upcoming-tile-${snapshot.id}` },
        ReactActual.createElement(ReactNative.Text, null, snapshot.name),
      ),
    ),
  };
});

jest.mock('../../../../../../../component-library/components/Skeleton', () => {
  const ReactNative = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    Skeleton: jest.fn(() =>
      ReactActual.createElement(ReactNative.View, {
        testID: 'skeleton-loader',
      }),
    ),
  };
});

jest.mock('../../../../components/RewardsErrorBanner', () => {
  const ReactNative = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return jest.fn(({ title, description }) =>
    ReactActual.createElement(
      ReactNative.View,
      { testID: 'error-banner' },
      ReactActual.createElement(
        ReactNative.Text,
        { testID: 'error-title' },
        title,
      ),
      ReactActual.createElement(
        ReactNative.Text,
        { testID: 'error-description' },
        description,
      ),
    ),
  );
});

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    Box: jest.fn(({ children, testID }) =>
      ReactActual.createElement(ReactNative.View, { testID }, children),
    ),
    Text: jest.fn(({ children }) =>
      ReactActual.createElement(ReactNative.Text, null, children),
    ),
    TextVariant: {
      HeadingMd: 'HeadingMd',
    },
    BoxFlexDirection: {
      Row: 'row',
    },
    BoxAlignItems: {
      Center: 'center',
    },
    BoxJustifyContent: {
      Between: 'space-between',
    },
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn((className) => ({ className })),
  })),
}));

jest.mock('../../../../Views/RewardsView.constants', () => ({
  REWARDS_VIEW_SELECTORS: {
    SNAPSHOTS_SECTION: 'rewards-view-snapshots-section',
  },
}));

/**
 * Creates a test snapshot with customizable overrides
 */
const createTestSnapshot = (
  overrides: Partial<SnapshotDto> = {},
): SnapshotDto => ({
  id: `snapshot-${Math.random().toString(36).substr(2, 9)}`,
  seasonId: 'season-1',
  name: 'Test Snapshot',
  description: 'Test description',
  tokenSymbol: 'TEST',
  tokenAmount: '1000000000000000000',
  tokenChainId: '1',
  tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
  receivingBlockchain: 'Ethereum',
  opensAt: '2025-03-01T00:00:00.000Z',
  closesAt: '2025-03-15T00:00:00.000Z',
  backgroundImage: {
    lightModeUrl: 'https://example.com/light.png',
    darkModeUrl: 'https://example.com/dark.png',
  },
  ...overrides,
});

describe('SnapshotsSection', () => {
  const mockUseSnapshots = useSnapshots as jest.MockedFunction<
    typeof useSnapshots
  >;
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockFetchSnapshots = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchSnapshots.mockClear();

    // Enable snapshots feature flag by default
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSnapshotsRewardsEnabledFlag) return true;
      return undefined;
    });
  });

  const setupMock = (
    options: {
      active?: SnapshotDto[];
      upcoming?: SnapshotDto[];
      previous?: SnapshotDto[];
      isLoading?: boolean;
      hasError?: boolean;
    } = {},
  ) => {
    const {
      active = [],
      upcoming = [],
      previous = [],
      isLoading = false,
      hasError = false,
    } = options;

    mockUseSnapshots.mockReturnValue({
      snapshots: [...active, ...upcoming, ...previous],
      categorizedSnapshots: { active, upcoming, previous },
      isLoading,
      hasError,
      fetchSnapshots: mockFetchSnapshots,
    });
  };

  describe('feature flag disabled', () => {
    it('returns null when snapshots feature flag is disabled', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSnapshotsRewardsEnabledFlag) return false;
        return undefined;
      });
      setupMock({ active: [], upcoming: [] });

      const { toJSON } = render(<SnapshotsSection />);

      expect(toJSON()).toBeNull();
    });
  });

  describe('empty state', () => {
    it('returns null when no snapshots and not loading/error', () => {
      setupMock({
        active: [],
        upcoming: [],
        isLoading: false,
        hasError: false,
      });

      const { toJSON } = render(<SnapshotsSection />);

      expect(toJSON()).toBeNull();
    });
  });

  describe('loading state', () => {
    it('renders loading skeleton when loading with no snapshots', () => {
      setupMock({
        active: [],
        upcoming: [],
        isLoading: true,
        hasError: false,
      });

      const { getByTestId } = render(<SnapshotsSection />);

      expect(getByTestId('skeleton-loader')).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('renders error banner when error with no snapshots', () => {
      setupMock({
        active: [],
        upcoming: [],
        isLoading: false,
        hasError: true,
      });

      const { getByTestId } = render(<SnapshotsSection />);

      expect(getByTestId('error-banner')).toBeTruthy();
      expect(strings).toHaveBeenCalledWith(
        'rewards.snapshots_section.error_title',
      );
      expect(strings).toHaveBeenCalledWith(
        'rewards.snapshots_section.error_description',
      );
    });
  });

  describe('with snapshots', () => {
    it('renders section with title', () => {
      const activeSnapshot = createTestSnapshot({
        id: 'active-1',
        name: 'Active Snapshot',
      });
      setupMock({ active: [activeSnapshot] });

      const { getByTestId } = render(<SnapshotsSection />);

      expect(getByTestId('rewards-view-snapshots-section')).toBeTruthy();
      expect(strings).toHaveBeenCalledWith('rewards.snapshots_section.title');
    });

    it('renders SnapshotTile for active snapshots', () => {
      const activeSnapshot1 = createTestSnapshot({
        id: 'active-1',
        name: 'Active Snapshot 1',
      });
      const activeSnapshot2 = createTestSnapshot({
        id: 'active-2',
        name: 'Active Snapshot 2',
      });
      setupMock({ active: [activeSnapshot1, activeSnapshot2] });

      const { getByTestId } = render(<SnapshotsSection />);

      expect(getByTestId('snapshot-tile-active-1')).toBeTruthy();
      expect(getByTestId('snapshot-tile-active-2')).toBeTruthy();
    });

    it('renders UpcomingSnapshotTileCondensed for upcoming snapshots', () => {
      const upcomingSnapshot1 = createTestSnapshot({
        id: 'upcoming-1',
        name: 'Upcoming Snapshot 1',
      });
      const upcomingSnapshot2 = createTestSnapshot({
        id: 'upcoming-2',
        name: 'Upcoming Snapshot 2',
      });
      setupMock({ upcoming: [upcomingSnapshot1, upcomingSnapshot2] });

      const { getByTestId } = render(<SnapshotsSection />);

      expect(getByTestId('upcoming-tile-upcoming-1')).toBeTruthy();
      expect(getByTestId('upcoming-tile-upcoming-2')).toBeTruthy();
    });

    it('renders mixed active and upcoming snapshots correctly', () => {
      const activeSnapshot = createTestSnapshot({
        id: 'active-1',
        name: 'Active Snapshot',
      });
      const upcomingSnapshot = createTestSnapshot({
        id: 'upcoming-1',
        name: 'Upcoming Snapshot',
      });
      setupMock({ active: [activeSnapshot], upcoming: [upcomingSnapshot] });

      const { getByTestId } = render(<SnapshotsSection />);

      expect(getByTestId('snapshot-tile-active-1')).toBeTruthy();
      expect(getByTestId('upcoming-tile-upcoming-1')).toBeTruthy();
    });
  });

  describe('refresh indicator', () => {
    it('shows loading indicator when refreshing existing data', () => {
      const activeSnapshot = createTestSnapshot({
        id: 'active-1',
        name: 'Active Snapshot',
      });
      setupMock({
        active: [activeSnapshot],
        isLoading: true,
        hasError: false,
      });

      const { getByTestId, queryByTestId } = render(<SnapshotsSection />);

      // Section renders with snapshots (not skeleton)
      expect(getByTestId('snapshot-tile-active-1')).toBeTruthy();
      // Skeleton is not shown when we have data
      expect(queryByTestId('skeleton-loader')).toBeNull();
    });
  });

  describe('sorting behavior', () => {
    it('displays active snapshots before upcoming snapshots', () => {
      const activeSnapshot = createTestSnapshot({
        id: 'active-1',
        name: 'Active',
        opensAt: '2025-03-15T00:00:00.000Z',
      });
      const upcomingSnapshot = createTestSnapshot({
        id: 'upcoming-1',
        name: 'Upcoming',
        opensAt: '2025-03-01T00:00:00.000Z',
      });

      setupMock({ active: [activeSnapshot], upcoming: [upcomingSnapshot] });

      const { toJSON } = render(<SnapshotsSection />);
      const json = JSON.stringify(toJSON());

      // Active snapshot should appear before upcoming in the rendered output
      const activeIndex = json.indexOf('snapshot-tile-active-1');
      const upcomingIndex = json.indexOf('upcoming-tile-upcoming-1');

      expect(activeIndex).toBeLessThan(upcomingIndex);
    });
  });
});
