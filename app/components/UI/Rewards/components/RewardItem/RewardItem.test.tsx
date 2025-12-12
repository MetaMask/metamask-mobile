import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import RewardItem from './RewardItem';
import {
  SeasonRewardDto,
  SeasonRewardType,
  RewardClaimStatus,
  RewardDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { selectRewardsActiveAccountAddress } from '../../../../../selectors/rewards';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';

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
jest.mock('../../../../../selectors/rewards', () => ({
  selectRewardsActiveAccountAddress: jest.fn(),
}));

const mockSelectRewardsActiveAccountAddress =
  selectRewardsActiveAccountAddress as jest.MockedFunction<
    typeof selectRewardsActiveAccountAddress
  >;

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock format utils
jest.mock('../../utils/formatUtils', () => ({
  formatNumber: jest.fn((value: number) => value.toString()),
  getIconName: jest.fn(() => 'Star'),
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

describe('RewardItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectRewardsActiveAccountAddress.mockReturnValue('0x123');
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsActiveAccountAddress) return '0x123';
      return undefined;
    });
  });

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

  it('displays end of season name when isEndOfSeasonReward is true and endOfSeasonName exists', () => {
    const seasonRewardWithEndOfSeason: SeasonRewardDto = {
      ...mockSeasonReward,
      endOfSeasonName: 'End of Season Reward Name',
    };

    const { getByText } = render(
      <RewardItem
        seasonReward={seasonRewardWithEndOfSeason}
        isLocked
        isEndOfSeasonReward
      />,
    );

    expect(getByText('End of Season Reward Name')).toBeDefined();
  });

  it('displays regular name when isEndOfSeasonReward is false', () => {
    const { getByText } = render(
      <RewardItem seasonReward={mockSeasonReward} isLocked />,
    );

    expect(getByText(mockSeasonReward.name)).toBeDefined();
  });

  it('displays end of season short description when isEndOfSeasonReward is true and endOfSeasonShortDescription exists', () => {
    const seasonRewardWithEndOfSeason: SeasonRewardDto = {
      ...mockSeasonReward,
      endOfSeasonShortDescription: 'End of season description',
    };

    const { getByText } = render(
      <RewardItem
        seasonReward={seasonRewardWithEndOfSeason}
        isLocked
        isEndOfSeasonReward
      />,
    );

    expect(getByText('End of season description')).toBeDefined();
  });
});
