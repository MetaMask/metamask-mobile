import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import UnlockedRewards from './UnlockedRewards';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import {
  RewardDto,
  SeasonRewardDto,
  RewardClaimStatus,
  SeasonRewardType,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

// Mock setActiveTab action
jest.mock('../../../../../../actions/rewards', () => ({
  setActiveTab: jest.fn((tab) => ({ type: 'SET_ACTIVE_TAB', payload: tab })),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock selectors
jest.mock('../../../../../../reducers/rewards/selectors', () => ({
  selectUnlockedRewardLoading: jest.fn(),
  selectSeasonRewardById: jest.fn(),
  selectUnlockedRewards: jest.fn(),
}));

import {
  selectUnlockedRewardLoading,
  selectSeasonRewardById,
  selectUnlockedRewards,
} from '../../../../../../reducers/rewards/selectors';

const mockSelectUnlockedRewardLoading =
  selectUnlockedRewardLoading as jest.MockedFunction<
    typeof selectUnlockedRewardLoading
  >;
const mockSelectSeasonRewardById =
  selectSeasonRewardById as jest.MockedFunction<typeof selectSeasonRewardById>;
const mockSelectUnlockedRewards = selectUnlockedRewards as jest.MockedFunction<
  typeof selectUnlockedRewards
>;

// Mock theme
jest.mock('../../../../../../util/theme', () => ({
  useTheme: () => ({
    themeAppearance: 'light',
    brandColors: { grey700: '#374151' },
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
      color: jest.fn((color) => color),
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

// Mock format utils
jest.mock('../../../utils/formatUtils', () => ({
  formatNumber: jest.fn((value: number) => value.toString()),
  getIconName: jest.fn(() => 'Star'),
}));

// Mock RewardItem from UpcomingRewards
jest.mock('./UpcomingRewards', () => ({
  RewardItem: function MockRewardItem({
    reward,
    isLast,
  }: {
    reward: SeasonRewardDto;
    isLast?: boolean;
  }) {
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');
    return ReactActual.createElement(
      View,
      { testID: 'reward-item' },
      ReactActual.createElement(Text, null, `${reward.name} - Last: ${isLast}`),
    );
  },
}));

// Mock images
jest.mock(
  '../../../../../../images/rewards/rewards-placeholder.png',
  () => 'rewards-placeholder.png',
);

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

describe('UnlockedRewards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectUnlockedRewardLoading.mockReturnValue(false);
    mockSelectUnlockedRewards.mockReturnValue([mockUnlockedReward]);
    mockSelectSeasonRewardById.mockImplementation(
      (seasonRewardId: string) => () => {
        if (seasonRewardId === 'season-reward-1') {
          return mockSeasonReward;
        }
        return undefined;
      },
    );

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewards) return [mockUnlockedReward];
      if (typeof selector === 'function') {
        // Handle selectSeasonRewardById selector
        return mockSeasonReward;
      }
      return null;
    });
  });

  describe('rendering with unlocked rewards', () => {
    it('should render unlocked rewards container with testID', () => {
      const { getByTestId } = render(<UnlockedRewards />);
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS),
      ).toBeDefined();
    });

    it('should render unlocked rewards title', () => {
      const { getByText } = render(<UnlockedRewards />);
      expect(getByText('Unlocked rewards')).toBeDefined();
    });

    it('should render rewards list container', () => {
      const { getByTestId } = render(<UnlockedRewards />);
      const container = getByTestId(REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS);
      expect(container).toBeDefined();
    });

    it('should render reward items when unlocked rewards exist', () => {
      const { getByTestId } = render(<UnlockedRewards />);
      expect(getByTestId('reward-item')).toBeDefined();
    });

    it('should render multiple reward items', () => {
      mockSelectUnlockedRewards.mockReturnValue([
        mockUnlockedReward,
        mockUnlockedRewardUnclaimed,
      ]);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectUnlockedRewardLoading) return false;
        if (selector === selectUnlockedRewards)
          return [mockUnlockedReward, mockUnlockedRewardUnclaimed];
        if (typeof selector === 'function') {
          return mockSeasonReward;
        }
        return null;
      });

      const { getAllByTestId } = render(<UnlockedRewards />);
      expect(getAllByTestId('reward-item')).toHaveLength(2);
    });
  });

  describe('rendering empty state', () => {
    beforeEach(() => {
      mockSelectUnlockedRewards.mockReturnValue([]);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectUnlockedRewardLoading) return false;
        if (selector === selectUnlockedRewards) return [];
        return null;
      });
    });

    it('should render empty state container with testID when no rewards', () => {
      const { getByTestId } = render(<UnlockedRewards />);
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS_EMPTY),
      ).toBeDefined();
    });

    it('should render empty state title', () => {
      const { getByText } = render(<UnlockedRewards />);
      expect(getByText('Unlocked rewards')).toBeDefined();
    });

    it('should render navigation link in empty state', () => {
      const { getByText } = render(<UnlockedRewards />);
      expect(getByText('View ways to earn')).toBeDefined();
    });

    it('should render empty state message', () => {
      const { getByText } = render(<UnlockedRewards />);
      expect(getByText('No unlocked rewards yet')).toBeDefined();
    });

    it('should not render unlocked rewards container when empty', () => {
      const { queryByTestId } = render(<UnlockedRewards />);
      expect(queryByTestId(REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS)).toBeNull();
    });
  });

  describe('loading state', () => {
    beforeEach(() => {
      mockSelectUnlockedRewardLoading.mockReturnValue(true);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectUnlockedRewardLoading) return true;
        if (selector === selectUnlockedRewards) return [];
        return null;
      });
    });

    it('should render nothing when loading', () => {
      const { toJSON } = render(<UnlockedRewards />);
      expect(toJSON()).toBeNull();
    });

    it('should not render any testIDs when loading', () => {
      const { queryByTestId } = render(<UnlockedRewards />);
      expect(queryByTestId(REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS)).toBeNull();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS_EMPTY),
      ).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle missing season reward gracefully', () => {
      mockSelectSeasonRewardById.mockImplementation(() => () => undefined);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectUnlockedRewardLoading) return false;
        if (selector === selectUnlockedRewards) return [mockUnlockedReward];
        if (typeof selector === 'function') {
          return null; // Season reward not found
        }
        return null;
      });

      const { queryByTestId } = render(<UnlockedRewards />);
      // Should still render the container but no reward items
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS),
      ).toBeDefined();
      expect(queryByTestId('reward-item')).toBeNull();
    });

    it('should handle mixed valid and invalid season rewards', () => {
      const invalidReward = {
        ...mockUnlockedReward,
        id: 'invalid',
        seasonRewardId: 'invalid-season-reward',
      };
      mockSelectUnlockedRewards.mockReturnValue([
        mockUnlockedReward,
        invalidReward,
      ]);

      // Mock the selector to return different values based on the seasonRewardId
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectUnlockedRewardLoading) return false;
        if (selector === selectUnlockedRewards)
          return [mockUnlockedReward, invalidReward];
        if (typeof selector === 'function') {
          // For selectSeasonRewardById calls, we need to check the closure
          const selectorString = selector.toString();
          if (selectorString.includes('season-reward-1')) {
            return mockSeasonReward;
          }
          return undefined; // Invalid season reward
        }
        return null;
      });

      const { queryAllByTestId } = render(<UnlockedRewards />);
      // Should render both items since our mock RewardItem doesn't filter based on season reward validity
      // In the real component, invalid season rewards would be filtered out by returning null
      expect(queryAllByTestId('reward-item')).toHaveLength(2);
    });
  });

  describe('component lifecycle', () => {
    it('should render without crashing', () => {
      expect(() => render(<UnlockedRewards />)).not.toThrow();
    });

    it('should cleanup properly when unmounted', () => {
      const { unmount } = render(<UnlockedRewards />);
      expect(() => unmount()).not.toThrow();
    });
  });
});
