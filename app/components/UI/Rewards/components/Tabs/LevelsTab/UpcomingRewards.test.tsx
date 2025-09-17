import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import UpcomingRewards, { RewardItem } from './UpcomingRewards';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import {
  SeasonTierDto,
  SeasonRewardDto,
  SeasonRewardType,
  RewardClaimStatus,
  RewardDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Mock selectors
jest.mock('../../../../../../reducers/rewards/selectors', () => ({
  selectSeasonTiers: jest.fn(),
  selectCurrentTier: jest.fn(),
}));

jest.mock('../../../../../../selectors/rewards', () => ({
  selectRewardsActiveAccountAddress: jest.fn(),
}));

import {
  selectSeasonTiers,
  selectCurrentTier,
} from '../../../../../../reducers/rewards/selectors';

import { selectRewardsActiveAccountAddress } from '../../../../../../selectors/rewards';

const mockSelectSeasonTiers = selectSeasonTiers as jest.MockedFunction<
  typeof selectSeasonTiers
>;
const mockSelectCurrentTier = selectCurrentTier as jest.MockedFunction<
  typeof selectCurrentTier
>;
const mockSelectRewardsActiveAccountAddress =
  selectRewardsActiveAccountAddress as jest.MockedFunction<
    typeof selectRewardsActiveAccountAddress
  >;

// Mock theme
jest.mock('../../../../../../util/theme', () => ({
  useTheme: () => ({
    themeAppearance: 'light',
    brandColors: { grey700: '#374151' },
  }),
}));

// Mock i18n
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock format utils
jest.mock('../../../utils/formatUtils', () => ({
  formatNumber: jest.fn((value: number) => value.toString()),
  getIconName: jest.fn(() => 'Star'),
}));

// Use actual design system components
// Remove mocks to let real components render with testIDs

// Mock only essential React Native components for testing
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Animated: {
    ...jest.requireActual('react-native').Animated,
    Value: jest.fn(() => ({
      interpolate: jest.fn(() => '0deg'),
    })),
    timing: jest.fn(() => ({ start: jest.fn() })),
    parallel: jest.fn(() => ({ start: jest.fn() })),
  },
}));

// Test data
const mockSeasonReward: SeasonRewardDto = {
  id: 'reward-1',
  name: 'Test Reward',
  shortDescription: 'A test reward',
  longDescription: 'A long description for the test reward',
  shortUnlockedDescription:
    'A short description for the test reward when unlocked',
  longUnlockedDescription:
    'A long description for the test reward when unlocked',
  iconName: 'Star',
  rewardType: SeasonRewardType.GENERIC,
  claimUrl: 'https://example.com/claim/{address}',
};

const mockReward: RewardDto = {
  id: 'unlocked-reward-1',
  seasonRewardId: 'reward-1',
  claimStatus: RewardClaimStatus.UNCLAIMED,
};

const mockSeasonTier: SeasonTierDto = {
  id: 'tier-1',
  name: 'Bronze',
  levelNumber: '1',
  pointsNeeded: 1000,
  image: {
    lightModeUrl: 'https://example.com/light.png',
    darkModeUrl: 'https://example.com/dark.png',
  },
  rewards: [mockSeasonReward],
};

const mockCurrentTier: SeasonTierDto = {
  id: 'current-tier',
  name: 'Starter',
  levelNumber: '0',
  pointsNeeded: 0,
  image: {
    lightModeUrl: 'https://example.com/starter-light.png',
    darkModeUrl: 'https://example.com/starter-dark.png',
  },
  rewards: [],
};

describe('UpcomingRewards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectSeasonTiers.mockReturnValue([mockCurrentTier, mockSeasonTier]);
    mockSelectCurrentTier.mockReturnValue(mockCurrentTier);
    mockSelectRewardsActiveAccountAddress.mockReturnValue('0x123');
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonTiers)
        return [mockCurrentTier, mockSeasonTier];
      if (selector === selectCurrentTier) return mockCurrentTier;
      if (selector === selectRewardsActiveAccountAddress) return '0x123';
      return [];
    });
  });

  it('should render tier image with testID', () => {
    const { getByTestId } = render(<UpcomingRewards />);
    expect(getByTestId(REWARDS_VIEW_SELECTORS.TIER_IMAGE)).toBeDefined();
  });

  it('should render tier name with testID', () => {
    const { getByTestId } = render(<UpcomingRewards />);
    expect(getByTestId(REWARDS_VIEW_SELECTORS.TIER_NAME)).toBeDefined();
  });

  it('should render tier points needed with testID', () => {
    const { getByTestId } = render(<UpcomingRewards />);
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.TIER_POINTS_NEEDED),
    ).toBeDefined();
  });

  it('should render tier rewards container with testID when tier has rewards', () => {
    const { getByTestId } = render(<UpcomingRewards />);
    expect(getByTestId(REWARDS_VIEW_SELECTORS.TIER_REWARDS)).toBeDefined();
  });

  it('should not render anything when there are no upcoming tiers', () => {
    // Set up scenario where current tier has higher points than all other tiers
    const lowerTier = { ...mockSeasonTier, pointsNeeded: 500 };
    const currentTierWithHigherPoints = {
      ...mockCurrentTier,
      pointsNeeded: 1000,
    };

    mockSelectSeasonTiers.mockReturnValue([
      lowerTier,
      currentTierWithHigherPoints,
    ]);
    mockSelectCurrentTier.mockReturnValue(currentTierWithHigherPoints);

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonTiers)
        return [lowerTier, currentTierWithHigherPoints];
      if (selector === selectCurrentTier) return currentTierWithHigherPoints;
      return [];
    });

    const { toJSON } = render(<UpcomingRewards />);
    expect(toJSON()).toBeNull();
  });
});

describe('RewardItem', () => {
  it('should render reward icon with testID', () => {
    const { getByTestId } = render(
      <RewardItem seasonReward={mockSeasonReward} isLocked />,
    );
    expect(getByTestId(REWARDS_VIEW_SELECTORS.TIER_REWARD_ICON)).toBeDefined();
  });

  it('should render reward name with testID', () => {
    const { getByTestId } = render(
      <RewardItem seasonReward={mockSeasonReward} isLocked />,
    );
    expect(getByTestId(REWARDS_VIEW_SELECTORS.TIER_REWARD_NAME)).toBeDefined();
  });

  it('should render reward description with testID', () => {
    const { getByTestId } = render(
      <RewardItem seasonReward={mockSeasonReward} isLocked />,
    );
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.TIER_REWARD_DESCRIPTION),
    ).toBeDefined();
  });

  it('should show claim button when reward is unlocked and unclaimed', () => {
    const { getByText } = render(
      <RewardItem
        reward={mockReward}
        seasonReward={mockSeasonReward}
        isLocked={false}
      />,
    );
    expect(getByText('rewards.unlocked_rewards.claim_label')).toBeDefined();
  });

  it('should not show claim button when reward is locked', () => {
    const { queryByText } = render(
      <RewardItem
        reward={mockReward}
        seasonReward={mockSeasonReward}
        isLocked
      />,
    );
    expect(queryByText('rewards.unlocked_rewards.claim_label')).toBeNull();
  });

  it('should show locked description when reward is locked', () => {
    const { getByText } = render(
      <RewardItem seasonReward={mockSeasonReward} isLocked />,
    );
    expect(getByText(mockSeasonReward.shortDescription)).toBeDefined();
  });

  it('should show unlocked description when reward is unlocked', () => {
    const { getByText } = render(
      <RewardItem
        reward={mockReward}
        seasonReward={mockSeasonReward}
        isLocked={false}
      />,
    );
    expect(getByText(mockSeasonReward.shortUnlockedDescription)).toBeDefined();
  });
});
