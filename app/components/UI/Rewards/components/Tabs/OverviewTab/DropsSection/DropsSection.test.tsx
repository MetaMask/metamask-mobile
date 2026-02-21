import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import DropsSection from './DropsSection';
import { useSeasonDrops } from '../../../../hooks/useSeasonDrops';
import { strings } from '../../../../../../../../locales/i18n';
import { selectDropsRewardsEnabledFlag } from '../../../../../../../selectors/featureFlagController/rewards';
import {
  DropStatus,
  type SeasonDropDto,
} from '../../../../../../../core/Engine/controllers/rewards-controller/types';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock(
  '../../../../../../../selectors/featureFlagController/rewards',
  () => ({
    selectDropsRewardsEnabledFlag: jest.fn(),
  }),
);

jest.mock('../../../../hooks/useSeasonDrops', () => ({
  useSeasonDrops: jest.fn(),
}));

jest.mock('../../../../components/DropTile/DropTile', () => {
  const ReactNative = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: jest.fn(({ drop }: { drop: { id: string; name: string } }) =>
      ReactActual.createElement(
        ReactNative.View,
        { testID: `drop-tile-${drop.id}` },
        ReactActual.createElement(ReactNative.Text, null, drop.name),
      ),
    ),
  };
});

jest.mock('../../../DropTile/UpcomingDropTileCondensed', () => {
  const ReactNative = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: jest.fn(({ drop }: { drop: { id: string; name: string } }) =>
      ReactActual.createElement(
        ReactNative.View,
        { testID: `upcoming-tile-${drop.id}` },
        ReactActual.createElement(ReactNative.Text, null, drop.name),
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
    DROPS_SECTION: 'rewards-view-drops-section',
  },
}));

/**
 * Creates a test drop with customizable overrides
 */
const createTestDrop = (
  overrides: Partial<SeasonDropDto> = {},
): SeasonDropDto => ({
  id: `drop-${Math.random().toString(36).substr(2, 9)}`,
  seasonId: 'season-1',
  name: 'Test Drop',
  description: 'Test description',
  tokenSymbol: 'TEST',
  tokenAmount: '1000000000000000000',
  tokenChainId: '1',
  tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
  receivingBlockchain: 1,
  opensAt: '2025-03-01T00:00:00.000Z',
  closesAt: '2025-03-15T00:00:00.000Z',
  image: {
    lightModeUrl: 'https://example.com/light.png',
    darkModeUrl: 'https://example.com/dark.png',
  },
  status: DropStatus.OPEN,
  ...overrides,
});

describe('DropsSection', () => {
  const mockUseSeasonDrops = useSeasonDrops as jest.MockedFunction<
    typeof useSeasonDrops
  >;
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockFetchDrops = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchDrops.mockClear();

    // Enable drops feature flag by default
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectDropsRewardsEnabledFlag) return true;
      return undefined;
    });
  });

  const setupMock = (
    options: {
      active?: SeasonDropDto[];
      upcoming?: SeasonDropDto[];
      previous?: SeasonDropDto[];
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

    mockUseSeasonDrops.mockReturnValue({
      drops: [...active, ...upcoming, ...previous],
      categorizedDrops: { active, upcoming, previous },
      isLoading,
      hasError,
      fetchDrops: mockFetchDrops,
    });
  };

  describe('feature flag disabled', () => {
    it('returns null when drops feature flag is disabled', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectDropsRewardsEnabledFlag) return false;
        return undefined;
      });
      setupMock({ active: [], upcoming: [] });

      const { toJSON } = render(<DropsSection />);

      expect(toJSON()).toBeNull();
    });
  });

  describe('empty state', () => {
    it('returns null when no drops and not loading/error', () => {
      setupMock({
        active: [],
        upcoming: [],
        isLoading: false,
        hasError: false,
      });

      const { toJSON } = render(<DropsSection />);

      expect(toJSON()).toBeNull();
    });
  });

  describe('loading state', () => {
    it('renders loading skeleton when loading with no drops', () => {
      setupMock({
        active: [],
        upcoming: [],
        isLoading: true,
        hasError: false,
      });

      const { getByTestId } = render(<DropsSection />);

      expect(getByTestId('skeleton-loader')).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('renders error banner when error with no drops', () => {
      setupMock({
        active: [],
        upcoming: [],
        isLoading: false,
        hasError: true,
      });

      const { getByTestId } = render(<DropsSection />);

      expect(getByTestId('error-banner')).toBeTruthy();
      expect(strings).toHaveBeenCalledWith('rewards.drop_section.error_title');
      expect(strings).toHaveBeenCalledWith(
        'rewards.drop_section.error_description',
      );
    });
  });

  describe('with drops', () => {
    it('renders section with title', () => {
      const activeDrop = createTestDrop({
        id: 'active-1',
        name: 'Active Drop',
        status: DropStatus.OPEN,
      });
      setupMock({ active: [activeDrop] });

      const { getByTestId } = render(<DropsSection />);

      expect(getByTestId('rewards-view-drops-section')).toBeTruthy();
      expect(strings).toHaveBeenCalledWith('rewards.drop_section.title');
    });

    it('renders DropTile for active drops', () => {
      const activeDrop1 = createTestDrop({
        id: 'active-1',
        name: 'Active Drop 1',
        status: DropStatus.OPEN,
      });
      const activeDrop2 = createTestDrop({
        id: 'active-2',
        name: 'Active Drop 2',
        status: DropStatus.OPEN,
      });
      setupMock({ active: [activeDrop1, activeDrop2] });

      const { getByTestId } = render(<DropsSection />);

      expect(getByTestId('drop-tile-active-1')).toBeTruthy();
      expect(getByTestId('drop-tile-active-2')).toBeTruthy();
    });

    it('renders UpcomingDropTileCondensed for upcoming drops', () => {
      const upcomingDrop1 = createTestDrop({
        id: 'upcoming-1',
        name: 'Upcoming Drop 1',
        status: DropStatus.UPCOMING,
      });
      const upcomingDrop2 = createTestDrop({
        id: 'upcoming-2',
        name: 'Upcoming Drop 2',
        status: DropStatus.UPCOMING,
      });
      setupMock({ upcoming: [upcomingDrop1, upcomingDrop2] });

      const { getByTestId } = render(<DropsSection />);

      expect(getByTestId('upcoming-tile-upcoming-1')).toBeTruthy();
      expect(getByTestId('upcoming-tile-upcoming-2')).toBeTruthy();
    });

    it('renders mixed active and upcoming drops correctly', () => {
      const activeDrop = createTestDrop({
        id: 'active-1',
        name: 'Active Drop',
        status: DropStatus.OPEN,
      });
      const upcomingDrop = createTestDrop({
        id: 'upcoming-1',
        name: 'Upcoming Drop',
        status: DropStatus.UPCOMING,
      });
      setupMock({ active: [activeDrop], upcoming: [upcomingDrop] });

      const { getByTestId } = render(<DropsSection />);

      expect(getByTestId('drop-tile-active-1')).toBeTruthy();
      expect(getByTestId('upcoming-tile-upcoming-1')).toBeTruthy();
    });
  });

  describe('refresh indicator', () => {
    it('shows loading indicator when refreshing existing data', () => {
      const activeDrop = createTestDrop({
        id: 'active-1',
        name: 'Active Drop',
        status: DropStatus.OPEN,
      });
      setupMock({
        active: [activeDrop],
        isLoading: true,
        hasError: false,
      });

      const { getByTestId, queryByTestId } = render(<DropsSection />);

      // Section renders with drops (not skeleton)
      expect(getByTestId('drop-tile-active-1')).toBeTruthy();
      // Skeleton is not shown when we have data
      expect(queryByTestId('skeleton-loader')).toBeNull();
    });
  });

  describe('sorting behavior', () => {
    it('displays active drops before upcoming drops', () => {
      const activeDrop = createTestDrop({
        id: 'active-1',
        name: 'Active',
        opensAt: '2025-03-15T00:00:00.000Z',
        status: DropStatus.OPEN,
      });
      const upcomingDrop = createTestDrop({
        id: 'upcoming-1',
        name: 'Upcoming',
        opensAt: '2025-03-01T00:00:00.000Z',
        status: DropStatus.UPCOMING,
      });

      setupMock({ active: [activeDrop], upcoming: [upcomingDrop] });

      const { toJSON } = render(<DropsSection />);
      const json = JSON.stringify(toJSON());

      // Active drop should appear before upcoming in the rendered output
      const activeIndex = json.indexOf('drop-tile-active-1');
      const upcomingIndex = json.indexOf('upcoming-tile-upcoming-1');

      expect(activeIndex).toBeLessThan(upcomingIndex);
    });
  });
});
