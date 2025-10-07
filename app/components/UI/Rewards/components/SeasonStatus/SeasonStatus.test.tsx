import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import SeasonStatus from './SeasonStatus';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;

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
  selectSeasonStatusError: jest.fn(),
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
  selectSeasonStatusError,
  selectNextTier,
} from '../../../../../reducers/rewards/selectors';

// Mock useSeasonStatus hook
jest.mock('../../hooks/useSeasonStatus', () => ({
  useSeasonStatus: jest.fn(),
}));

import { useSeasonStatus } from '../../hooks/useSeasonStatus';

// Mock fallback tier image
jest.mock(
  '../../../../../images/rewards/tiers/rewards-s1-tier-1.png',
  () => 'fallback-tier-image',
);

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
const mockSelectSeasonStatusError =
  selectSeasonStatusError as jest.MockedFunction<
    typeof selectSeasonStatusError
  >;
const mockUseSeasonStatus = useSeasonStatus as jest.MockedFunction<
  typeof useSeasonStatus
>;

// Mock useTailwind hook
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const mockTw = jest.fn(() => ({}));
    // Add the style method to the mock function
    Object.assign(mockTw, {
      style: jest.fn((styles) => {
        if (Array.isArray(styles)) {
          return styles.reduce((acc, style) => ({ ...acc, ...style }), {});
        }
        return styles || {};
      }),
    });
    return mockTw;
  },
}));

// Mock format utilities
jest.mock('../../utils/formatUtils', () => ({
  formatNumber: jest.fn((value) => value?.toLocaleString() || '0'),
  formatTimeRemaining: jest.fn(() => '15d 10h'),
}));

import { formatNumber, formatTimeRemaining } from '../../utils/formatUtils';
const mockFormatNumber = formatNumber as jest.MockedFunction<
  typeof formatNumber
>;
const mockFormatTimeRemaining = formatTimeRemaining as jest.MockedFunction<
  typeof formatTimeRemaining
>;

// Import types
import { SeasonTierDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.level': 'Level',
      'rewards.season_ends': 'Season ends',
      'rewards.points': 'Points',
      'rewards.point': 'Point',
      'rewards.to_level_up': 'to level up',
      'rewards.season_status_error.error_fetching_title':
        "Season balance couldn't be loaded",
      'rewards.season_status_error.error_fetching_description':
        'Check your connection and try again.',
      'rewards.season_status_error.retry_button': 'Retry',
    };
    return translations[key] || key;
  }),
  default: {
    locale: 'en',
  },
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
jest.mock('../../../../../images/rewards/metamask-rewards-points.svg', () => {
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

// Mock RewardsErrorBanner component
jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ReactActual.forwardRef(
      (
        {
          title,
          description,
          onConfirm,
          confirmButtonLabel,
          testID,
          ...props
        }: {
          title?: string;
          description?: string;
          onConfirm?: () => void;
          confirmButtonLabel?: string;
          testID?: string;
        },
        ref: unknown,
      ) =>
        ReactActual.createElement(
          View,
          {
            testID: testID || 'rewards-error-banner',
            ref,
            ...props,
          },
          [
            ReactActual.createElement(Text, { key: 'title' }, title),
            ReactActual.createElement(
              Text,
              { key: 'description' },
              description,
            ),
            onConfirm &&
              ReactActual.createElement(
                TouchableOpacity,
                { key: 'confirm', onPress: onConfirm },
                ReactActual.createElement(
                  Text,
                  {},
                  confirmButtonLabel || 'Confirm',
                ),
              ),
          ],
        ),
    ),
  };
});

// Mock setSeasonStatusError action
jest.mock('../../../../../actions/rewards', () => ({
  setSeasonStatusError: jest.fn((payload) => ({
    type: 'rewards/setSeasonStatusError',
    payload,
  })),
}));

// Mock lodash capitalize but preserve the rest of lodash
jest.mock('lodash', () => {
  const actual = jest.requireActual('lodash');
  return {
    ...actual,
    capitalize: jest.fn((str) => str?.charAt(0).toUpperCase() + str?.slice(1)),
  };
});

// Mock RewardsThemeImageComponent
jest.mock('../ThemeImageComponent', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ReactActual.forwardRef(
      (
        props: {
          themeImage?: { lightModeUrl?: string; darkModeUrl?: string };
          style?: unknown;
          testID?: string;
        },
        ref: unknown,
      ) =>
        ReactActual.createElement(View, {
          testID: props.testID || 'season-tier-image',
          'data-light-mode-url': props.themeImage?.lightModeUrl,
          'data-dark-mode-url': props.themeImage?.darkModeUrl,
          style: props.style,
          ref,
        }),
    ),
  };
});

describe('SeasonStatus', () => {
  const mockDispatch = jest.fn();

  // Default mock values
  const defaultMockValues = {
    seasonStatusLoading: false,
    seasonStatusError: null,
    seasonStartDate: new Date('2024-01-01T00:00:00Z'),
    seasonEndDate: new Date('2024-12-31T23:59:59Z'),
    balanceTotal: 1500,
    currentTier: {
      id: 'bronze',
      name: 'bronze',
      pointsNeeded: 0,
      image: {
        lightModeUrl: 'lightModeUrl',
        darkModeUrl: 'darkModeUrl',
      },
      levelNumber: 'Level 1',
      rewards: [],
    },
    nextTier: {
      id: 'silver',
      name: 'silver',
      pointsNeeded: 2000,
      image: {
        lightModeUrl: 'lightModeUrl',
        darkModeUrl: 'darkModeUrl',
      },
      levelNumber: 'Level 2',
      rewards: [],
    },
    nextTierPointsNeeded: 500,
    seasonTiers: [
      {
        id: 'bronze',
        name: 'bronze',
        pointsNeeded: 0,
        image: {
          lightModeUrl: 'lightModeUrl',
          darkModeUrl: 'darkModeUrl',
        },
        levelNumber: 'Level 1',
        rewards: [],
      },
      {
        id: 'silver',
        name: 'silver',
        pointsNeeded: 2000,
        image: {
          lightModeUrl: 'lightModeUrl',
          darkModeUrl: 'darkModeUrl',
        },
        levelNumber: 'Level 2',
        rewards: [],
      },
      {
        id: 'gold',
        name: 'gold',
        pointsNeeded: 5000,
        image: {
          lightModeUrl: 'lightModeUrl',
          darkModeUrl: 'darkModeUrl',
        },
        levelNumber: 'Level 3',
        rewards: [],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset format utilities to default behavior
    mockFormatNumber.mockImplementation(
      (value) => value?.toLocaleString() || '0',
    );
    mockFormatTimeRemaining.mockImplementation(() => '15d 10h');

    // Setup default mock returns
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseSeasonStatus.mockImplementation(() => ({
      fetchSeasonStatus: jest.fn(),
    }));
    mockSelectSeasonStatusLoading.mockReturnValue(
      defaultMockValues.seasonStatusLoading,
    );
    mockSelectSeasonStatusError.mockReturnValue(
      defaultMockValues.seasonStatusError,
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
      expect(getByText('1,500')).toBeTruthy();
      expect(getByText('points')).toBeTruthy();
      expect(getByText('500 to level up')).toBeTruthy();
      expect(getByTestId('season-tier-image')).toBeTruthy();
      expect(getByTestId('metamask-rewards-points-svg')).toBeTruthy();
    });

    it('should capitalize tier names correctly', () => {
      mockSelectCurrentTier.mockReturnValue({
        id: 'gold',
        name: 'gold',
        pointsNeeded: 5000,
        image: {
          lightModeUrl: 'lightModeUrl',
          darkModeUrl: 'darkModeUrl',
        },
        levelNumber: 'Level 3',
        rewards: [],
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
        image: {
          lightModeUrl: 'lightModeUrl',
          darkModeUrl: 'darkModeUrl',
        },
        levelNumber: 'Level 2',
        rewards: [],
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
      mockFormatTimeRemaining.mockReturnValue('15d 10h');

      const { getByText } = render(<SeasonStatus />);

      expect(getByText('15d 10h')).toBeTruthy();
    });

    it('should display only minutes when hours is 0 but minutes > 0', () => {
      mockFormatTimeRemaining.mockReturnValue('45m');

      const { getByText } = render(<SeasonStatus />);

      expect(getByText('45m')).toBeTruthy();
    });

    it('should not display time remaining when formatTimeRemaining returns empty string', () => {
      mockFormatTimeRemaining.mockReturnValue('');

      const { queryByText } = render(<SeasonStatus />);

      expect(queryByText('Season ends')).toBeNull();
    });

    it('should not display time remaining when seasonEndDate is null', () => {
      mockSelectSeasonEndDate.mockReturnValue(null);

      const { queryByText } = render(<SeasonStatus />);

      expect(queryByText('Season ends')).toBeNull();
    });

    it('should call formatTimeRemaining with correct date when seasonEndDate is available', () => {
      const endDate = new Date('2024-12-31T23:59:59Z');
      mockSelectSeasonEndDate.mockReturnValue(endDate);

      render(<SeasonStatus />);

      expect(mockFormatTimeRemaining).toHaveBeenCalledWith(endDate);
    });
  });

  describe('Points Formatting and Pluralization', () => {
    it('should display formatted points with proper pluralization for multiple points', () => {
      mockSelectBalanceTotal.mockReturnValue(1500);
      mockFormatNumber.mockReturnValue('1,500');

      const { getByText } = render(<SeasonStatus />);

      expect(getByText('1,500')).toBeTruthy();
      expect(getByText('points')).toBeTruthy();
    });

    it('should display singular "point" for single point', () => {
      mockSelectBalanceTotal.mockReturnValue(1);
      mockFormatNumber.mockReturnValue('1');

      const { getByText } = render(<SeasonStatus />);

      expect(getByText('1')).toBeTruthy();
      expect(getByText('point')).toBeTruthy();
    });

    it('should display "0 points" when balance is null', () => {
      mockSelectBalanceTotal.mockReturnValue(null);
      mockFormatNumber.mockReturnValue('0');

      const { getByText } = render(<SeasonStatus />);

      expect(getByText('0')).toBeTruthy();
      expect(getByText('points')).toBeTruthy();
    });

    it('should display "0 points" when balance is undefined', () => {
      mockSelectBalanceTotal.mockReturnValue(null);
      mockFormatNumber.mockReturnValue('0');

      const { getByText } = render(<SeasonStatus />);

      expect(getByText('0')).toBeTruthy();
      expect(getByText('points')).toBeTruthy();
    });

    it('should call formatNumber with correct balance value', () => {
      mockSelectBalanceTotal.mockReturnValue(1500);

      render(<SeasonStatus />);

      expect(mockFormatNumber).toHaveBeenCalledWith(1500);
    });
  });

  describe('Next Tier Points Display', () => {
    it('should display next tier points needed when available', () => {
      mockSelectNextTierPointsNeeded.mockReturnValue(500);
      mockFormatNumber.mockReturnValue('500');

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

  describe('RewardsThemeImageComponent Integration', () => {
    it('should render RewardsThemeImageComponent with correct testID when tier has image', () => {
      const { getByTestId } = render(<SeasonStatus />);

      expect(getByTestId('season-tier-image')).toBeTruthy();
    });

    it('should pass correct themeImage prop to RewardsThemeImageComponent', () => {
      const { getByTestId } = render(<SeasonStatus />);

      const tierImage = getByTestId('season-tier-image');
      expect(tierImage.props['data-light-mode-url']).toBe('lightModeUrl');
      expect(tierImage.props['data-dark-mode-url']).toBe('darkModeUrl');
    });

    it('should pass correct style prop to RewardsThemeImageComponent', () => {
      const { getByTestId } = render(<SeasonStatus />);

      const tierImage = getByTestId('season-tier-image');
      expect(tierImage.props.style).toBeDefined();
    });

    it('should render fallback Image when tier has no image', () => {
      // Given: tier without image
      mockSelectCurrentTier.mockReturnValue({
        id: 'bronze',
        name: 'bronze',
        pointsNeeded: 0,
        image: undefined,
        levelNumber: 'Level 1',
        rewards: [],
      } as unknown as SeasonTierDto);

      const { queryByTestId } = render(<SeasonStatus />);

      // RewardsThemeImageComponent should not be rendered
      expect(queryByTestId('season-tier-image')).toBeNull();
    });

    it('should render RewardsThemeImageComponent with updated image when tier changes', () => {
      // Given: initial tier with image
      const { getByTestId, rerender } = render(<SeasonStatus />);
      const initialTierImage = getByTestId('season-tier-image');
      expect(initialTierImage.props['data-light-mode-url']).toBe(
        'lightModeUrl',
      );

      // When: tier changes to different image URLs
      mockSelectCurrentTier.mockReturnValue({
        id: 'silver',
        name: 'silver',
        pointsNeeded: 2000,
        image: {
          lightModeUrl: 'newLightModeUrl',
          darkModeUrl: 'newDarkModeUrl',
        },
        levelNumber: 'Level 2',
        rewards: [],
      });
      rerender(<SeasonStatus />);

      // Then: new image URLs are used
      const updatedTierImage = getByTestId('season-tier-image');
      expect(updatedTierImage.props['data-light-mode-url']).toBe(
        'newLightModeUrl',
      );
      expect(updatedTierImage.props['data-dark-mode-url']).toBe(
        'newDarkModeUrl',
      );
    });
  });

  describe('Memoized Values', () => {
    it('should update displayed points when balance changes', () => {
      // Given: initial balance of 1500
      mockFormatNumber.mockReturnValue('1,500');
      const { getByText, rerender } = render(<SeasonStatus />);
      expect(getByText('1,500')).toBeTruthy();
      expect(getByText('points')).toBeTruthy();

      // When: balance changes to 1000
      mockSelectBalanceTotal.mockReturnValue(1000);
      mockFormatNumber.mockReturnValue('1,000');
      rerender(<SeasonStatus />);

      // Then: new balance is displayed
      expect(getByText('1,000')).toBeTruthy();
      expect(getByText('points')).toBeTruthy();
    });

    it('should update time remaining when seasonEndDate changes', () => {
      // Given: initial time showing "15d 10h"
      const { getByText, rerender } = render(<SeasonStatus />);
      expect(getByText('15d 10h')).toBeTruthy();

      // When: end date changes and formatTimeRemaining returns different value
      mockSelectSeasonEndDate.mockReturnValue(new Date('2025-01-01T00:00:00Z'));
      mockFormatTimeRemaining.mockReturnValue('30d 5h');
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
        image: {
          lightModeUrl: 'lightModeUrl',
          darkModeUrl: 'darkModeUrl',
        },
        levelNumber: 'Level 3',
        rewards: [],
      });
      rerender(<SeasonStatus />);

      // Then: new tier level and name are displayed
      expect(getByText('Level 3')).toBeTruthy();
      expect(getByText('Gold')).toBeTruthy();
    });
  });

  describe('seasonStatusError states', () => {
    it('should not show error banner when no seasonStatusError', () => {
      // Given: no error state
      mockSelectSeasonStatusError.mockReturnValue(null);

      // When: component renders
      const { queryByTestId, getByText } = render(<SeasonStatus />);

      // Then: error banner should not be displayed, normal content should be shown
      expect(queryByTestId('rewards-error-banner')).toBeNull();
      expect(getByText('Bronze')).toBeTruthy();
    });

    it('should show normal content when seasonStatusError exists but seasonStartDate is available', () => {
      // Given: error state but season start date is available
      mockSelectSeasonStatusError.mockReturnValue('Network error');
      mockSelectSeasonStartDate.mockReturnValue(
        new Date('2024-01-01T00:00:00Z'),
      );

      // When: component renders
      const { getByText, queryByTestId } = render(<SeasonStatus />);

      // Then: normal content should be displayed, not error banner
      expect(getByText('Bronze')).toBeTruthy();
      expect(queryByTestId('rewards-error-banner')).toBeNull();
    });

    it('should show error banner when seasonStatusError exists and no seasonStartDate', () => {
      // Given: error state and no season start date
      mockSelectSeasonStatusError.mockReturnValue('Network error');
      mockSelectSeasonStartDate.mockReturnValue(null);

      // When: component renders
      const { getByTestId, getByText } = render(<SeasonStatus />);

      // Then: error banner should be displayed
      expect(getByTestId('rewards-error-banner')).toBeTruthy();
      expect(getByText("Season balance couldn't be loaded")).toBeTruthy();
      expect(getByText('Check your connection and try again.')).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });
  });
});
