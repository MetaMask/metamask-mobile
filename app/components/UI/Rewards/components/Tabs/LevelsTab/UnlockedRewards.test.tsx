import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import UnlockedRewards from './UnlockedRewards';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import {
  RewardDto,
  SeasonRewardDto,
  RewardClaimStatus,
  SeasonRewardType,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import {
  selectUnlockedRewardLoading,
  selectUnlockedRewards,
  selectUnlockedRewardError,
  selectSeasonStartDate,
  selectCurrentTier,
} from '../../../../../../reducers/rewards/selectors';
import { useUnlockedRewards } from '../../../hooks/useUnlockedRewards';
import { SkeletonProps } from '../../../../../../component-library/components/Skeleton';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

// Mock actions
jest.mock('../../../../../../actions/rewards', () => ({
  setActiveTab: jest.fn(() => 'MOCKED_ACTION'),
}));

// Mock selectors
jest.mock('../../../../../../reducers/rewards/selectors', () => ({
  selectUnlockedRewardLoading: jest.fn(),
  selectSeasonRewardById: jest.fn(),
  selectUnlockedRewards: jest.fn(),
  selectUnlockedRewardError: jest.fn(),
  selectSeasonStartDate: jest.fn(),
  selectCurrentTier: jest.fn(),
}));

// Mock theme
jest.mock('../../../../../../util/theme', () => ({
  useTheme: () => ({
    themeAppearance: 'light',
    colors: {
      grey: {
        700: '#374151',
      },
    },
  }),
}));

// Mock useTailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const mockFn = jest.fn((styles: unknown) => {
      if (Array.isArray(styles)) {
        return styles.reduce((acc, style) => ({ ...acc, ...style }), {});
      }
      if (typeof styles === 'string') {
        return { testID: `tw-${styles}` };
      }
      return styles || {};
    });
    const tw = Object.assign(mockFn, {
      style: mockFn,
      color: jest.fn((c) => c),
    });
    return tw;
  },
}));

// Mock i18n
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.unlocked_rewards.title': 'Unlocked rewards',
      'rewards.unlocked_rewards.empty': 'No unlocked rewards yet',
      'rewards.unlocked_rewards.see_ways_to_earn': 'View ways to earn',
    };
    return translations[key] || key;
  }),
}));

// Mock RewardItem
jest.mock('../../RewardItem/RewardItem', () => jest.fn(() => null));

// Mock Skeleton
jest.mock('../../../../../../component-library/components/Skeleton', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    Skeleton: ({ style, ...props }: SkeletonProps) =>
      ReactActual.createElement(View, {
        testID: 'skeleton',
        style,
        ...props,
      }),
  };
});

// Mock the useUnlockedRewards hook
jest.mock('../../../hooks/useUnlockedRewards', () => ({
  useUnlockedRewards: jest.fn(),
}));

// Mock RewardsErrorBanner
jest.mock('../../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      description,
      onConfirm,
      confirmButtonLabel,
    }: {
      title: string;
      description: string;
      onConfirm?: () => void;
      confirmButtonLabel?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'rewards-error-banner' },
        ReactActual.createElement(Text, { testID: 'error-title' }, title),
        ReactActual.createElement(
          Text,
          { testID: 'error-description' },
          description,
        ),
        onConfirm &&
          ReactActual.createElement(
            TouchableOpacity,
            {
              onPress: onConfirm,
              testID: 'error-retry-button',
            },
            ReactActual.createElement(
              Text,
              {},
              confirmButtonLabel || 'Confirm',
            ),
          ),
      ),
  };
});

const mockUseSelector = useSelector as jest.Mock;
const mockUseDispatch = useDispatch as jest.Mock;
const mockUseUnlockedRewards = useUnlockedRewards as jest.MockedFunction<
  typeof useUnlockedRewards
>;

// Mock data
const mockSeasonReward: SeasonRewardDto = {
  id: 'season-reward-1',
  name: 'Test Season Reward',
  shortDescription: 'A test season reward',
  longDescription: 'A long description for the test season reward',
  shortUnlockedDescription:
    'A short description for the test season reward when unlocked',
  longUnlockedDescription:
    'A long description for the test season reward when unlocked',
  iconName: 'Star',
  rewardType: SeasonRewardType.GENERIC,
};

const mockUnlockedReward: RewardDto = {
  id: 'unlocked-reward-1',
  seasonRewardId: 'season-reward-1',
  claimStatus: RewardClaimStatus.CLAIMED,
};

const mockUnlockedRewardUnclaimed: RewardDto = {
  id: 'unlocked-reward-2',
  seasonRewardId: 'season-reward-1',
  claimStatus: RewardClaimStatus.UNCLAIMED,
};

const mockCurrentTier = {
  id: 'silver',
  name: 'Silver',
  pointsNeeded: 1000,
  image: {
    lightModeUrl: 'light-url',
    darkModeUrl: 'dark-url',
  },
  levelNumber: '2',
  rewards: [],
};

describe('UnlockedRewards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(jest.fn());
    mockUseUnlockedRewards.mockReturnValue({
      fetchUnlockedRewards: jest.fn(),
    });
    mockUseUnlockedRewards.mockClear();
  });

  const setupMocks = ({
    loading = false,
    rewards = [],
    error = false,
    seasonStartDate = new Date('2024-01-01'),
    seasonReward = mockSeasonReward,
    currentTier = mockCurrentTier,
  }: {
    loading?: boolean;
    rewards?: RewardDto[] | null;
    error?: boolean;
    seasonStartDate?: Date | null;
    seasonReward?: SeasonRewardDto | undefined;
    currentTier?: typeof mockCurrentTier | null;
  }) => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewardLoading) {
        return loading;
      }
      if (selector === selectUnlockedRewards) {
        return rewards;
      }
      if (selector === selectUnlockedRewardError) {
        return error;
      }
      if (selector === selectSeasonStartDate) {
        return seasonStartDate;
      }
      if (selector === selectCurrentTier) {
        return currentTier;
      }
      if (typeof selector === 'function') {
        return seasonReward;
      }
      return undefined;
    });
  };

  it('should call useUnlockedRewards hook', () => {
    setupMocks({ rewards: [] });
    render(<UnlockedRewards />);
    expect(mockUseUnlockedRewards).toHaveBeenCalledTimes(1);
  });

  it('should render unlocked rewards container with testID', () => {
    setupMocks({ rewards: [mockUnlockedReward] });
    const { getByTestId } = render(<UnlockedRewards />);
    expect(getByTestId(REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS)).toBeDefined();
    expect(mockUseUnlockedRewards).toHaveBeenCalledTimes(1);
  });

  it('should render the unlocked rewards title', () => {
    setupMocks({ rewards: [mockUnlockedReward] });
    const { getByText } = render(<UnlockedRewards />);
    expect(getByText('Unlocked rewards')).toBeDefined();
    expect(mockUseUnlockedRewards).toHaveBeenCalledTimes(1);
  });

  it('should render a list of reward items', () => {
    setupMocks({ rewards: [mockUnlockedReward, mockUnlockedRewardUnclaimed] });
    const { getByTestId } = render(<UnlockedRewards />);
    expect(getByTestId(REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS)).toBeDefined();
  });

  describe('Loading and Empty States', () => {
    it('should render loading state when loading is true', () => {
      setupMocks({ loading: true, rewards: null });
      const { getByText } = render(<UnlockedRewards />);

      // Should show section header
      expect(getByText('Unlocked rewards')).toBeTruthy();
    });

    it('should render loading state when rewards is null and seasonStartDate exists', () => {
      setupMocks({
        loading: false,
        rewards: null,
        error: false,
        seasonStartDate: new Date('2024-01-01'),
      });
      const { getByText } = render(<UnlockedRewards />);

      // Should show section header with loading indicator
      expect(getByText('Unlocked rewards')).toBeTruthy();
    });

    it('should not render when rewards is empty array', () => {
      setupMocks({ rewards: [] });
      const { queryByTestId } = render(<UnlockedRewards />);

      // Should not render the component when rewards is empty array
      expect(queryByTestId(REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS)).toBeNull();
    });

    it('should render skeleton when loading and currentTier has pointsNeeded', () => {
      setupMocks({
        loading: true,
        rewards: null,
        currentTier: mockCurrentTier,
      });
      const { getByText } = render(<UnlockedRewards />);

      // Should show section header
      expect(getByText('Unlocked rewards')).toBeTruthy();
    });

    it('should render skeleton when rewards is null, not loading, no error, and currentTier has pointsNeeded', () => {
      setupMocks({
        loading: false,
        rewards: null,
        error: false,
        currentTier: mockCurrentTier,
      });
      const { getByText, getByTestId } = render(<UnlockedRewards />);

      // Should show section header
      expect(getByText('Unlocked rewards')).toBeTruthy();
      // Should show skeleton
      expect(getByTestId('skeleton')).toBeTruthy();
    });

    it('should not render when currentTier is null', () => {
      setupMocks({
        rewards: [mockUnlockedReward],
        currentTier: null,
      });
      const { queryByTestId } = render(<UnlockedRewards />);

      // Should not render the component when currentTier is null
      expect(queryByTestId(REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS)).toBeNull();
    });

    it('should not render when currentTier has no pointsNeeded', () => {
      setupMocks({
        rewards: [mockUnlockedReward],
        currentTier: { ...mockCurrentTier, pointsNeeded: 0 },
      });
      const { queryByTestId } = render(<UnlockedRewards />);

      // Should not render the component when currentTier has no pointsNeeded
      expect(queryByTestId(REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS)).toBeNull();
    });
  });

  describe('Error States', () => {
    it('should render error banner when there is an error and no rewards', () => {
      setupMocks({
        loading: false,
        rewards: null,
        error: true,
        seasonStartDate: new Date('2024-01-01'),
      });
      const { getByText, getByTestId } = render(<UnlockedRewards />);

      // Should show section header
      expect(getByText('Unlocked rewards')).toBeTruthy();

      // Should show error banner
      expect(getByTestId('rewards-error-banner')).toBeTruthy();
    });

    it('should not render error banner when loading', () => {
      setupMocks({
        loading: true,
        rewards: null,
        error: true,
        seasonStartDate: new Date('2024-01-01'),
      });
      const { getByText, queryByTestId } = render(<UnlockedRewards />);

      // Should show section header
      expect(getByText('Unlocked rewards')).toBeTruthy();

      // Should NOT show error banner when loading
      expect(queryByTestId('rewards-error-banner')).toBeNull();
    });

    it('should not render error banner when rewards exist', () => {
      setupMocks({
        loading: false,
        rewards: [mockUnlockedReward],
        error: true,
        seasonStartDate: new Date('2024-01-01'),
      });
      const { getByText, queryByTestId } = render(<UnlockedRewards />);

      // Should show section header
      expect(getByText('Unlocked rewards')).toBeTruthy();

      // Should NOT show error banner when rewards exist
      expect(queryByTestId('rewards-error-banner')).toBeNull();
    });
  });

  describe('Reward Item Rendering', () => {
    it('should not render a reward item if season reward is not found', () => {
      setupMocks({ rewards: [mockUnlockedReward], seasonReward: undefined });
      const { getByTestId } = render(<UnlockedRewards />);
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS),
      ).toBeDefined();
      expect(mockUseUnlockedRewards).toHaveBeenCalledTimes(1);
    });

    it('should render reward count badge when rewards exist', () => {
      setupMocks({
        rewards: [mockUnlockedReward, mockUnlockedRewardUnclaimed],
      });
      const { getByText } = render(<UnlockedRewards />);

      // Should show section header with count
      expect(getByText('Unlocked rewards')).toBeTruthy();
      expect(getByText('2')).toBeTruthy(); // Count badge
    });

    it('should not show count badge when loading', () => {
      setupMocks({
        loading: true,
        rewards: [mockUnlockedReward],
        seasonStartDate: new Date('2024-01-01'),
      });
      const { getByText, queryByText } = render(<UnlockedRewards />);

      // Should show section header
      expect(getByText('Unlocked rewards')).toBeTruthy();

      // Should NOT show count badge when loading
      expect(queryByText('1')).toBeNull();
    });
  });
});
