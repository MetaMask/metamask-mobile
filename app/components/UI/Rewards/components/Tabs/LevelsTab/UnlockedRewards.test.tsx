import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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
} from '../../../../../../reducers/rewards/selectors';

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
jest.mock('./RewardItem', () => jest.fn(() => null));

// Mock placeholder SVG
jest.mock('../../../../../../images/rewards/rewards-placeholder.svg', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return React.forwardRef(
    (props: Record<string, unknown>, _ref: React.Ref<unknown>) =>
      React.createElement(View, {
        testID: 'unlocked-rewards-placeholder',
        ...props,
      }),
  );
});

const mockUseSelector = useSelector as jest.Mock;
const mockUseDispatch = useDispatch as jest.Mock;
const mockSelectUnlockedRewardLoading =
  selectUnlockedRewardLoading as jest.Mock;
const mockSelectUnlockedRewards = selectUnlockedRewards as jest.Mock;

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
    mockUseDispatch.mockReturnValue(jest.fn());
  });

  const setupMocks = ({
    loading = false,
    rewards = [],
    seasonReward = mockSeasonReward,
  }: {
    loading?: boolean;
    rewards?: RewardDto[];
    seasonReward?: SeasonRewardDto | undefined;
  }) => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === mockSelectUnlockedRewardLoading) {
        return loading;
      }
      if (selector === mockSelectUnlockedRewards) {
        return rewards;
      }
      if (typeof selector === 'function') {
        return seasonReward;
      }
      return undefined;
    });
  };

  it('should render unlocked rewards container with testID', () => {
    setupMocks({ rewards: [mockUnlockedReward] });
    const { getByTestId } = render(<UnlockedRewards />);
    expect(getByTestId(REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS)).toBeDefined();
  });

  it('should render the unlocked rewards title', () => {
    setupMocks({ rewards: [mockUnlockedReward] });
    const { getByText } = render(<UnlockedRewards />);
    expect(getByText('Unlocked rewards')).toBeDefined();
  });

  it('should render a list of reward items', () => {
    setupMocks({ rewards: [mockUnlockedReward, mockUnlockedRewardUnclaimed] });
    const { getByTestId } = render(<UnlockedRewards />);
    expect(getByTestId(REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS)).toBeDefined();
  });

  it('should show a loading indicator when loading', () => {
    setupMocks({ loading: true });
    const { queryByTestId } = render(<UnlockedRewards />);
    expect(queryByTestId(REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS)).toBeNull();
  });

  it('should show an empty state message when there are no rewards', () => {
    setupMocks({ rewards: [] });
    const { getByText, getByTestId } = render(<UnlockedRewards />);
    expect(getByText('No unlocked rewards yet')).toBeDefined();
    expect(getByTestId('unlocked-rewards-placeholder')).toBeDefined();
  });

  it('should render a "View ways to earn" button in the empty state', () => {
    setupMocks({ rewards: [] });
    const { getByText } = render(<UnlockedRewards />);
    expect(getByText('View ways to earn')).toBeDefined();
  });

  it('should dispatch setActiveTab when "View ways to earn" is pressed', () => {
    const dispatch = jest.fn();
    mockUseDispatch.mockReturnValue(dispatch);
    setupMocks({ rewards: [] });

    const { getByText } = render(<UnlockedRewards />);
    const button = getByText('View ways to earn');
    fireEvent.press(button);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith('MOCKED_ACTION');
  });

  it('should not render a reward item if season reward is not found', () => {
    setupMocks({ rewards: [mockUnlockedReward], seasonReward: undefined });
    const { getByTestId } = render(<UnlockedRewards />);
    expect(getByTestId(REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS)).toBeDefined();
  });
});
