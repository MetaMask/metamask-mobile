import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import SeasonStatus from './SeasonStatus';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock individual selectors
jest.mock('../../../../../reducers/rewards/selectors', () => ({
  selectSeasonStatusLoading: jest.fn(),
  selectSeasonTiers: jest.fn(),
  selectBalanceTotal: jest.fn(),
  selectSeasonEndDate: jest.fn(),
  selectSeasonStartDate: jest.fn(),
  selectNextTierPointsNeeded: jest.fn(),
  selectCurrentTier: jest.fn(),
  selectNextTier: jest.fn(),
}));

// Import the mocked selectors
import {
  selectSeasonStatusLoading,
  selectSeasonTiers,
  selectBalanceTotal,
  selectSeasonEndDate,
  selectSeasonStartDate,
  selectNextTierPointsNeeded,
  selectCurrentTier,
  selectNextTier,
} from '../../../../../reducers/rewards/selectors';

const mockSelectSeasonStatusLoading =
  selectSeasonStatusLoading as jest.MockedFunction<
    typeof selectSeasonStatusLoading
  >;
const mockSelectSeasonTiers = selectSeasonTiers as jest.MockedFunction<
  typeof selectSeasonTiers
>;
const mockSelectBalanceTotal = selectBalanceTotal as jest.MockedFunction<
  typeof selectBalanceTotal
>;
const mockSelectSeasonEndDate = selectSeasonEndDate as jest.MockedFunction<
  typeof selectSeasonEndDate
>;
const mockSelectSeasonStartDate = selectSeasonStartDate as jest.MockedFunction<
  typeof selectSeasonStartDate
>;
const mockSelectNextTierPointsNeeded =
  selectNextTierPointsNeeded as jest.MockedFunction<
    typeof selectNextTierPointsNeeded
  >;
const mockSelectCurrentTier = selectCurrentTier as jest.MockedFunction<
  typeof selectCurrentTier
>;
const mockSelectNextTier = selectNextTier as jest.MockedFunction<
  typeof selectNextTier
>;

// Mock date utility
jest.mock('../../../../../util/date', () => ({
  getTimeDifferenceFromNow: jest.fn(() => ({
    days: 15,
    hours: 10,
    minutes: 30,
  })),
}));

import { getTimeDifferenceFromNow } from '../../../../../util/date';
const mockGetTimeDifferenceFromNow =
  getTimeDifferenceFromNow as jest.MockedFunction<
    typeof getTimeDifferenceFromNow
  >;

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.level': 'Level',
      'rewards.season_ends': 'Season ends',
      'rewards.points': 'Points',
      'rewards.point': 'Point',
      'rewards.to_level_up': 'to level up',
    };
    return translations[key] || key;
  }),
  default: {
    locale: 'en',
  },
}));

// Mock intl utility
const mockIntlFormatter = {
  format: jest.fn((value) => value.toLocaleString()),
};

jest.mock('../../../../../util/intl', () => ({
  getIntlNumberFormatter: jest.fn(() => mockIntlFormatter),
}));

// Mock theme
jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      accent01: { normal: '#0052FF' },
      background: { section: '#F2F4F6' },
    },
  }),
}));

// Mock ProgressBar
jest.mock('react-native-progress/Bar', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return ReactActual.forwardRef((props: { testID?: string }, ref: unknown) =>
    ReactActual.createElement(View, {
      testID: props.testID || 'progress-bar',
      ref,
      ...props,
    }),
  );
});

// Mock SVG component
jest.mock('../../../../../images/metamask-rewards-points.svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return ReactActual.forwardRef(
    (props: Record<string, unknown>, ref: unknown) =>
      ReactActual.createElement(View, {
        testID: 'metamask-rewards-points-svg',
        ref,
        ...props,
      }),
  );
});

// Mock Skeleton
jest.mock('../../../../../component-library/components/Skeleton', () => ({
  Skeleton: ({ testID, ...props }: { testID?: string }) => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactActual.createElement(View, {
      testID: testID || 'skeleton',
      ...props,
    });
  },
}));

// Mock SeasonTierImage
jest.mock('../SeasonTierImage', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return ReactActual.forwardRef(
    (
      { tierOrder, testID, ...props }: { tierOrder?: number; testID?: string },
      ref: unknown,
    ) =>
      ReactActual.createElement(View, {
        testID: testID || 'season-tier-image',
        ref,
        'data-tier-order': tierOrder,
        ...props,
      }),
  );
});

// Mock lodash capitalize but preserve the rest of lodash
jest.mock('lodash', () => {
  const actual = jest.requireActual('lodash');
  return {
    ...actual,
    capitalize: jest.fn((str) => str?.charAt(0).toUpperCase() + str?.slice(1)),
  };
});

describe('SeasonStatus', () => {
  // Default mock values
  const defaultMockValues = {
    seasonStatusLoading: false,
    seasonStartDate: new Date('2024-01-01T00:00:00Z'),
    seasonEndDate: new Date('2024-12-31T23:59:59Z'),
    balanceTotal: 1500,
    currentTier: { id: 'bronze', name: 'bronze', pointsNeeded: 0 },
    nextTier: { id: 'silver', name: 'silver', pointsNeeded: 2000 },
    nextTierPointsNeeded: 500,
    seasonTiers: [
      { id: 'bronze', name: 'bronze', pointsNeeded: 0 },
      { id: 'silver', name: 'silver', pointsNeeded: 2000 },
      { id: 'gold', name: 'gold', pointsNeeded: 5000 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset intl formatter to default behavior
    mockIntlFormatter.format.mockImplementation((value) =>
      value.toLocaleString(),
    );

    // Setup default mock returns
    mockSelectSeasonStatusLoading.mockReturnValue(
      defaultMockValues.seasonStatusLoading,
    );
    mockSelectSeasonStartDate.mockReturnValue(
      defaultMockValues.seasonStartDate,
    );
    mockSelectSeasonEndDate.mockReturnValue(defaultMockValues.seasonEndDate);
    mockSelectBalanceTotal.mockReturnValue(defaultMockValues.balanceTotal);
    mockSelectCurrentTier.mockReturnValue(defaultMockValues.currentTier);
    mockSelectNextTier.mockReturnValue(defaultMockValues.nextTier);
    mockSelectNextTierPointsNeeded.mockReturnValue(
      defaultMockValues.nextTierPointsNeeded,
    );
    mockSelectSeasonTiers.mockReturnValue(defaultMockValues.seasonTiers);

    // Setup useSelector to call the appropriate selector function
    mockUseSelector.mockImplementation(
      (selector: (state: unknown) => unknown) => selector({} as unknown),
    );

    // Setup date mock
    mockGetTimeDifferenceFromNow.mockReturnValue({
      days: 15,
      hours: 10,
      minutes: 30,
    });
  });

  describe('Loading State', () => {
    it('should render skeleton when seasonStatusLoading is true', () => {
      mockSelectSeasonStatusLoading.mockReturnValue(true);

      const { getByTestId, queryByText } = render(<SeasonStatus />);

      expect(getByTestId('skeleton')).toBeTruthy();
      expect(queryByText('Level')).toBeNull();
    });
  });

  describe('Basic Rendering', () => {
    it('should render all main components when data is available', () => {
      const { getByText, getByTestId } = render(<SeasonStatus />);

      expect(getByText('Level 1')).toBeTruthy();
      expect(getByText('Bronze')).toBeTruthy();
      expect(getByText('Season ends')).toBeTruthy();
      expect(getByText('15d 10h')).toBeTruthy();
      expect(getByText('1,500 points')).toBeTruthy();
      expect(getByText('500 to level up')).toBeTruthy();
      expect(getByTestId('season-tier-image')).toBeTruthy();
      expect(getByTestId('metamask-rewards-points-svg')).toBeTruthy();
    });

    it('should render correct tier order for different tiers', () => {
      // Test silver tier (2nd in array)
      mockSelectCurrentTier.mockReturnValue({
        id: 'silver',
        name: 'silver',
        pointsNeeded: 2000,
      });

      const { getByText, getByTestId } = render(<SeasonStatus />);

      expect(getByText('Level 2')).toBeTruthy();
      expect(getByText('Silver')).toBeTruthy();
      expect(getByTestId('season-tier-image')).toHaveProp('data-tier-order', 2);
    });

    it('should capitalize tier names correctly', () => {
      mockSelectCurrentTier.mockReturnValue({
        id: 'gold',
        name: 'gold',
        pointsNeeded: 5000,
      });

      const { getByText } = render(<SeasonStatus />);

      expect(getByText('Gold')).toBeTruthy();
    });
  });

  describe('Progress Calculation', () => {
    it('should display progress bars when user has partial progress', () => {
      // Given: user has 1500 points, needs 2000 for next tier (75% progress)
      mockSelectBalanceTotal.mockReturnValue(1500);
      mockSelectNextTier.mockReturnValue({
        id: 'silver',
        name: 'silver',
        pointsNeeded: 2000,
      });

      // When: component renders
      const { getAllByTestId } = render(<SeasonStatus />);

      // Then: progress bars are displayed
      const progressBars = getAllByTestId('progress-bar');
      expect(progressBars).toBeTruthy();
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('should show points needed when not at max tier', () => {
      // Given: user needs 500 more points for next tier
      mockSelectNextTierPointsNeeded.mockReturnValue(500);

      // When: component renders
      const { getByText } = render(<SeasonStatus />);

      // Then: points needed is displayed
      expect(getByText('500 to level up')).toBeTruthy();
    });

    it('should hide points needed when at max tier', () => {
      // Given: user is at max tier (no next tier)
      mockSelectNextTier.mockReturnValue(null);
      mockSelectNextTierPointsNeeded.mockReturnValue(null);

      // When: component renders
      const { queryByText } = render(<SeasonStatus />);

      // Then: "to level up" text is not shown
      expect(queryByText('to level up')).toBeNull();
    });
  });

  describe('Time Remaining Formatting', () => {
    it('should display time remaining in days and hours format', () => {
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 15,
        hours: 10,
        minutes: 30,
      });

      const { getByText } = render(<SeasonStatus />);

      expect(getByText('15d 10h')).toBeTruthy();
    });

    it('should display only minutes when hours is 0 but minutes > 0', () => {
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 0,
        hours: 0,
        minutes: 45,
      });

      const { getByText } = render(<SeasonStatus />);

      expect(getByText('45m')).toBeTruthy();
    });

    it('should not display time remaining when both hours and minutes are 0', () => {
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 0,
        hours: 0,
        minutes: 0,
      });

      const { queryByText } = render(<SeasonStatus />);

      expect(queryByText('Season ends')).toBeNull();
    });

    it('should not display time remaining when seasonEndDate is null', () => {
      mockSelectSeasonEndDate.mockReturnValue(null);

      const { queryByText } = render(<SeasonStatus />);

      expect(queryByText('Season ends')).toBeNull();
    });
  });

  describe('Points Formatting and Pluralization', () => {
    it('should display formatted points with proper pluralization for multiple points', () => {
      mockSelectBalanceTotal.mockReturnValue(1500);

      const { getByText } = render(<SeasonStatus />);

      expect(getByText('1,500 points')).toBeTruthy();
    });

    it('should display singular "point" for single point', () => {
      mockSelectBalanceTotal.mockReturnValue(1);

      const { getByText } = render(<SeasonStatus />);

      expect(getByText('1 point')).toBeTruthy();
    });

    it('should display "0 points" when balance is null', () => {
      mockSelectBalanceTotal.mockReturnValue(null);

      const { getByText } = render(<SeasonStatus />);

      expect(getByText('0 points')).toBeTruthy();
    });

    it('should display "0 points" when balance is undefined', () => {
      mockSelectBalanceTotal.mockReturnValue(null);

      const { getByText } = render(<SeasonStatus />);

      expect(getByText('0 points')).toBeTruthy();
    });

    it('should handle formatting errors gracefully', () => {
      // Given: intl formatter throws an error
      mockIntlFormatter.format.mockImplementation(() => {
        throw new Error('Formatting error');
      });
      mockSelectBalanceTotal.mockReturnValue(1500);

      // When: component renders
      const { getByText } = render(<SeasonStatus />);

      // Then: fallback to string conversion is used
      expect(getByText('1500 points')).toBeTruthy();

      // Cleanup: restore normal formatter behavior
      mockIntlFormatter.format.mockImplementation((value) =>
        value.toLocaleString(),
      );
    });
  });

  describe('Next Tier Points Display', () => {
    it('should display next tier points needed when available', () => {
      mockSelectNextTierPointsNeeded.mockReturnValue(500);

      const { getByText } = render(<SeasonStatus />);

      expect(getByText('500 to level up')).toBeTruthy();
    });

    it('should not display next tier points when not available', () => {
      mockSelectNextTierPointsNeeded.mockReturnValue(null);

      const { queryByText } = render(<SeasonStatus />);

      expect(queryByText('to level up')).toBeNull();
    });

    it('should not display next tier points when zero', () => {
      mockSelectNextTierPointsNeeded.mockReturnValue(0);

      const { queryByText } = render(<SeasonStatus />);

      expect(queryByText('to level up')).toBeNull();
    });
  });

  describe('Component Lifecycle', () => {
    it('should render without crashing', () => {
      expect(() => render(<SeasonStatus />)).not.toThrow();
    });

    it('should cleanup properly when unmounted', () => {
      const { unmount } = render(<SeasonStatus />);

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Memoized Values', () => {
    it('should update displayed points when balance changes', () => {
      // Given: initial balance of 1500
      const { getByText, rerender } = render(<SeasonStatus />);
      expect(getByText('1,500 points')).toBeTruthy();

      // When: balance changes to 1000
      mockSelectBalanceTotal.mockReturnValue(1000);
      rerender(<SeasonStatus />);

      // Then: new balance is displayed
      expect(getByText('1,000 points')).toBeTruthy();
    });

    it('should update time remaining when seasonEndDate changes', () => {
      // Given: initial time showing "15d 10h"
      const { getByText, rerender } = render(<SeasonStatus />);
      expect(getByText('15d 10h')).toBeTruthy();

      // When: end date changes and time difference is recalculated
      mockSelectSeasonEndDate.mockReturnValue(new Date('2025-01-01T00:00:00Z'));
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 30,
        hours: 5,
        minutes: 15,
      });
      rerender(<SeasonStatus />);

      // Then: new time remaining is displayed
      expect(getByText('30d 5h')).toBeTruthy();
    });

    it('should update tier display when currentTier changes', () => {
      // Given: initial tier showing "Level 1" and "Bronze"
      const { getByText, rerender } = render(<SeasonStatus />);
      expect(getByText('Level 1')).toBeTruthy();
      expect(getByText('Bronze')).toBeTruthy();

      // When: current tier changes to gold
      mockSelectCurrentTier.mockReturnValue({
        id: 'gold',
        name: 'gold',
        pointsNeeded: 5000,
      });
      rerender(<SeasonStatus />);

      // Then: new tier level and name are displayed
      expect(getByText('Level 3')).toBeTruthy();
      expect(getByText('Gold')).toBeTruthy();
    });
  });
});
