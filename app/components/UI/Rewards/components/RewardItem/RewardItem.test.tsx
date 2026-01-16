import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import RewardItem from './RewardItem';
import {
  SeasonRewardDto,
  SeasonRewardType,
  RewardClaimStatus,
  RewardDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { selectRewardsActiveAccountAddress } from '../../../../../selectors/rewards';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import Routes from '../../../../../constants/navigation/Routes';
import { Button } from '@metamask/design-system-react-native';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const mockNavigate = jest.fn();
// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
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
  formatTimeRemaining: jest.fn(() => null),
}));

import { formatTimeRemaining } from '../../utils/formatUtils';

const mockFormatTimeRemaining = formatTimeRemaining as jest.MockedFunction<
  typeof formatTimeRemaining
>;

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

  it('renders claim button with default label when reward is unlocked and unclaimed', () => {
    const { getByText } = render(
      <RewardItem
        reward={mockReward}
        seasonReward={mockSeasonReward}
        isLocked={false}
      />,
    );
    expect(getByText('rewards.unlocked_rewards.claim_label')).toBeDefined();
  });

  it('renders claim button with custom claimCtaLabel when provided', () => {
    const { getByText, queryByText } = render(
      <RewardItem
        reward={mockReward}
        seasonReward={mockSeasonReward}
        isLocked={false}
        claimCtaLabel="Custom Claim"
      />,
    );

    expect(getByText('Custom Claim')).toBeDefined();
    expect(queryByText('rewards.unlocked_rewards.claim_label')).toBeNull();
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
        reward={mockReward}
        seasonReward={seasonRewardWithEndOfSeason}
        isLocked={false}
        isEndOfSeasonReward
      />,
    );

    expect(getByText('End of season description')).toBeDefined();
  });

  it('displays check_back_soon for locked end of season rewards', () => {
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

    expect(
      getByText('rewards.end_of_season_rewards.check_back_soon'),
    ).toBeDefined();
  });

  describe('end of season reward expiration', () => {
    const fixedNow = new Date('2025-01-15T12:00:00.000Z');
    const futureDate = '2025-01-16T12:00:00.000Z'; // 1 day after fixedNow
    const pastDate = '2025-01-14T12:00:00.000Z'; // 1 day before fixedNow

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(fixedNow);
      mockFormatTimeRemaining.mockReturnValue(null);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('displays expired indicator when end of season reward claim has expired', () => {
      const seasonRewardWithExpiredClaim: SeasonRewardDto = {
        ...mockSeasonReward,
        claimEndDate: pastDate,
      };

      const { getByText } = render(
        <RewardItem
          reward={mockReward}
          seasonReward={seasonRewardWithExpiredClaim}
          isLocked={false}
          isEndOfSeasonReward
        />,
      );

      expect(getByText('rewards.unlocked_rewards.expired')).toBeDefined();
    });

    it('displays time remaining for end of season reward when claimEndDate is in future', () => {
      mockFormatTimeRemaining.mockReturnValue('2d 5h');
      const seasonRewardWithFutureClaim: SeasonRewardDto = {
        ...mockSeasonReward,
        claimEndDate: futureDate,
      };

      const { getByText } = render(
        <RewardItem
          reward={mockReward}
          seasonReward={seasonRewardWithFutureClaim}
          isLocked={false}
          isEndOfSeasonReward
        />,
      );

      expect(getByText(/2d 5h/)).toBeDefined();
      expect(getByText(/rewards.unlocked_rewards.time_left/)).toBeDefined();
    });

    it('hides claim button when end of season reward claim has expired', () => {
      const seasonRewardWithExpiredClaim: SeasonRewardDto = {
        ...mockSeasonReward,
        claimEndDate: pastDate,
      };

      const { queryByTestId } = render(
        <RewardItem
          reward={mockReward}
          seasonReward={seasonRewardWithExpiredClaim}
          isLocked={false}
          isEndOfSeasonReward
        />,
      );

      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.TIER_REWARD_CLAIM_BUTTON),
      ).toBeNull();
    });

    it('hides claim button for end of season reward when already claimed', () => {
      const claimedReward: RewardDto = {
        ...mockReward,
        claimStatus: RewardClaimStatus.CLAIMED,
      };
      const seasonRewardWithFutureClaim: SeasonRewardDto = {
        ...mockSeasonReward,
        claimEndDate: futureDate,
      };

      const { queryByTestId } = render(
        <RewardItem
          reward={claimedReward}
          seasonReward={seasonRewardWithFutureClaim}
          isLocked={false}
          isEndOfSeasonReward
        />,
      );

      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.TIER_REWARD_CLAIM_BUTTON),
      ).toBeNull();
    });

    it('displays claimed label for end of season reward when claimed', () => {
      const claimedReward: RewardDto = {
        ...mockReward,
        claimStatus: RewardClaimStatus.CLAIMED,
      };
      const seasonRewardWithFutureClaim: SeasonRewardDto = {
        ...mockSeasonReward,
        claimEndDate: futureDate,
      };

      const { getByText } = render(
        <RewardItem
          reward={claimedReward}
          seasonReward={seasonRewardWithFutureClaim}
          isLocked={false}
          isEndOfSeasonReward
        />,
      );

      expect(getByText('rewards.unlocked_rewards.claimed_label')).toBeDefined();
    });

    it('displays custom endOfSeasonClaimedDescription when provided for claimed end of season reward', () => {
      const claimedReward: RewardDto = {
        ...mockReward,
        claimStatus: RewardClaimStatus.CLAIMED,
      };
      const seasonRewardWithFutureClaim: SeasonRewardDto = {
        ...mockSeasonReward,
        claimEndDate: futureDate,
      };

      const { getByText, queryByText } = render(
        <RewardItem
          reward={claimedReward}
          seasonReward={seasonRewardWithFutureClaim}
          isLocked={false}
          isEndOfSeasonReward
          endOfSeasonClaimedDescription="Custom claimed description"
        />,
      );

      expect(getByText('Custom claimed description')).toBeDefined();
      expect(queryByText('rewards.unlocked_rewards.claimed_label')).toBeNull();
    });

    it('hides claim button for non-end-of-season reward when already claimed', () => {
      const claimedReward: RewardDto = {
        ...mockReward,
        claimStatus: RewardClaimStatus.CLAIMED,
      };

      const { queryByText } = render(
        <RewardItem
          reward={claimedReward}
          seasonReward={mockSeasonReward}
          isLocked={false}
          isEndOfSeasonReward={false}
        />,
      );

      expect(queryByText('rewards.unlocked_rewards.claim_label')).toBeNull();
    });

    it('displays fallback shortDescription when isEndOfSeasonReward and no endOfSeasonShortDescription exists', () => {
      const seasonRewardWithoutEndOfSeasonDesc: SeasonRewardDto = {
        ...mockSeasonReward,
        endOfSeasonShortDescription: undefined,
      };

      const { getByText } = render(
        <RewardItem
          seasonReward={seasonRewardWithoutEndOfSeasonDesc}
          isLocked={false}
          isEndOfSeasonReward
        />,
      );

      expect(getByText(mockSeasonReward.shortDescription)).toBeDefined();
    });

    it('does not show claim button for end of season reward when claimEndDate not set', () => {
      const seasonRewardWithoutClaimEndDate: SeasonRewardDto = {
        ...mockSeasonReward,
        claimEndDate: undefined,
      };

      const { queryByTestId } = render(
        <RewardItem
          reward={mockReward}
          seasonReward={seasonRewardWithoutClaimEndDate}
          isLocked={false}
          isEndOfSeasonReward
        />,
      );

      // End of season rewards show arrow icon instead of claim button
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.TIER_REWARD_CLAIM_BUTTON),
      ).toBeNull();
    });

    it('disables TouchableOpacity when end of season reward claim has expired', () => {
      const seasonRewardWithExpiredClaim: SeasonRewardDto = {
        ...mockSeasonReward,
        claimEndDate: pastDate,
      };

      const { UNSAFE_getByType } = render(
        <RewardItem
          reward={mockReward}
          seasonReward={seasonRewardWithExpiredClaim}
          isLocked={false}
          isEndOfSeasonReward
        />,
      );

      const touchableOpacity = UNSAFE_getByType(TouchableOpacity);
      expect(touchableOpacity.props.disabled).toBe(true);
    });

    it('does not call onPress when end of season reward claim has expired', () => {
      const mockOnPress = jest.fn();
      const seasonRewardWithExpiredClaim: SeasonRewardDto = {
        ...mockSeasonReward,
        claimEndDate: pastDate,
      };

      const { UNSAFE_getByType } = render(
        <RewardItem
          reward={mockReward}
          seasonReward={seasonRewardWithExpiredClaim}
          isLocked={false}
          isEndOfSeasonReward
          onPress={mockOnPress}
        />,
      );

      const touchableOpacity = UNSAFE_getByType(TouchableOpacity);

      // Call onPress directly to test the handler logic
      touchableOpacity.props.onPress?.();

      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('claimed rewards display', () => {
    it('displays claimed label with icon for POINTS_BOOST reward when claimed without time status', () => {
      mockFormatTimeRemaining.mockReturnValue(null);
      const claimedPointsBoostReward: RewardDto = {
        ...mockReward,
        claimStatus: RewardClaimStatus.CLAIMED,
      };
      const pointsBoostSeasonReward: SeasonRewardDto = {
        ...mockSeasonReward,
        rewardType: SeasonRewardType.POINTS_BOOST,
      };

      const { getByText } = render(
        <RewardItem
          reward={claimedPointsBoostReward}
          seasonReward={pointsBoostSeasonReward}
          isLocked={false}
        />,
      );

      expect(getByText('rewards.unlocked_rewards.claimed_label')).toBeDefined();
    });

    it('displays claimed label with icon for ALPHA_FOX_INVITE reward when claimed', () => {
      mockFormatTimeRemaining.mockReturnValue(null);
      const claimedAlphaFoxReward: RewardDto = {
        ...mockReward,
        claimStatus: RewardClaimStatus.CLAIMED,
      };
      const alphaFoxSeasonReward: SeasonRewardDto = {
        ...mockSeasonReward,
        rewardType: SeasonRewardType.ALPHA_FOX_INVITE,
      };

      const { getByText } = render(
        <RewardItem
          reward={claimedAlphaFoxReward}
          seasonReward={alphaFoxSeasonReward}
          isLocked={false}
        />,
      );

      expect(getByText('rewards.unlocked_rewards.claimed_label')).toBeDefined();
    });

    it('displays shortUnlockedDescription for claimed GENERIC reward', () => {
      mockFormatTimeRemaining.mockReturnValue(null);
      const claimedGenericReward: RewardDto = {
        ...mockReward,
        claimStatus: RewardClaimStatus.CLAIMED,
      };

      const { getByText } = render(
        <RewardItem
          reward={claimedGenericReward}
          seasonReward={mockSeasonReward}
          isLocked={false}
        />,
      );

      expect(
        getByText(mockSeasonReward.shortUnlockedDescription),
      ).toBeDefined();
    });
  });

  describe('handleRewardItemPress', () => {
    beforeEach(() => {
      mockNavigate.mockClear();
    });

    it('calls onPress callback when provided and reward is unlocked', () => {
      const mockOnPress = jest.fn();

      const { UNSAFE_getByType } = render(
        <RewardItem
          reward={mockReward}
          seasonReward={mockSeasonReward}
          isLocked={false}
          onPress={mockOnPress}
        />,
      );

      const touchableOpacity = UNSAFE_getByType(TouchableOpacity);
      touchableOpacity.props.onPress?.();

      expect(mockOnPress).toHaveBeenCalledWith(mockReward, mockSeasonReward);
    });

    it('navigates to claim modal when no onPress callback provided', () => {
      const { UNSAFE_getByType } = render(
        <RewardItem
          reward={mockReward}
          seasonReward={mockSeasonReward}
          isLocked={false}
        />,
      );

      const touchableOpacity = UNSAFE_getByType(TouchableOpacity);
      touchableOpacity.props.onPress?.();

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_CLAIM_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          title: mockSeasonReward.name,
          rewardId: mockReward.id,
          seasonRewardId: mockSeasonReward.id,
          rewardType: mockSeasonReward.rewardType,
          isLocked: false,
          hasClaimed: false,
        }),
      );
    });

    it('does not navigate or call onPress when reward is locked', () => {
      const mockOnPress = jest.fn();

      const { UNSAFE_getByType } = render(
        <RewardItem
          reward={mockReward}
          seasonReward={mockSeasonReward}
          isLocked
          onPress={mockOnPress}
        />,
      );

      const touchableOpacity = UNSAFE_getByType(TouchableOpacity);
      touchableOpacity.props.onPress?.();

      expect(mockOnPress).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not navigate or call onPress when reward is already claimed', () => {
      const mockOnPress = jest.fn();
      const claimedReward: RewardDto = {
        ...mockReward,
        claimStatus: RewardClaimStatus.CLAIMED,
      };

      const { UNSAFE_getByType } = render(
        <RewardItem
          reward={claimedReward}
          seasonReward={mockSeasonReward}
          isLocked={false}
          onPress={mockOnPress}
        />,
      );

      const touchableOpacity = UNSAFE_getByType(TouchableOpacity);
      touchableOpacity.props.onPress?.();

      expect(mockOnPress).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('claim button', () => {
    beforeEach(() => {
      mockNavigate.mockClear();
    });

    it('calls handleRewardItemPress and stopPropagation when claim button is pressed', () => {
      const { UNSAFE_getAllByType } = render(
        <RewardItem
          reward={mockReward}
          seasonReward={mockSeasonReward}
          isLocked={false}
        />,
      );

      const buttons = UNSAFE_getAllByType(Button);
      const claimButton = buttons[0];

      // Call onPress directly with a mock event that has stopPropagation
      const mockEvent = { stopPropagation: jest.fn() };
      claimButton.props.onPress(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_CLAIM_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          rewardId: mockReward.id,
        }),
      );
    });

    it('does not show claim button for end of season reward', () => {
      const { queryByTestId } = render(
        <RewardItem
          reward={mockReward}
          seasonReward={mockSeasonReward}
          isLocked={false}
          isEndOfSeasonReward
        />,
      );

      // End of season rewards show arrow icon instead of claim button
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.TIER_REWARD_CLAIM_BUTTON),
      ).toBeNull();
    });
  });

  describe('ALPHA_FOX_INVITE reward type', () => {
    const alphaFoxSeasonReward: SeasonRewardDto = {
      ...mockSeasonReward,
      rewardType: SeasonRewardType.ALPHA_FOX_INVITE,
    };

    beforeEach(() => {
      mockNavigate.mockClear();
    });

    it('navigates with showInput true for ALPHA_FOX_INVITE reward', () => {
      const { UNSAFE_getByType } = render(
        <RewardItem
          reward={mockReward}
          seasonReward={alphaFoxSeasonReward}
          isLocked={false}
        />,
      );

      const touchableOpacity = UNSAFE_getByType(TouchableOpacity);
      touchableOpacity.props.onPress?.();

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_CLAIM_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          showInput: true,
          inputPlaceholder:
            'rewards.upcoming_rewards.alpha_fox_invite_input_placeholder',
        }),
      );
    });
  });

  describe('styling variations', () => {
    it('renders with compact styling when compact prop is true', () => {
      const { getByTestId } = render(
        <RewardItem seasonReward={mockSeasonReward} isLocked compact />,
      );

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.TIER_REWARD_ICON),
      ).toBeDefined();
    });

    it('renders without border when isLast is true', () => {
      const { getByTestId } = render(
        <RewardItem seasonReward={mockSeasonReward} isLocked isLast />,
      );

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.TIER_REWARD_ICON),
      ).toBeDefined();
    });
  });

  describe('rewardClaimUrl', () => {
    beforeEach(() => {
      mockNavigate.mockClear();
    });

    it('generates claimUrl with address substitution', () => {
      const seasonRewardWithClaimUrl: SeasonRewardDto = {
        ...mockSeasonReward,
        claimUrl: 'https://example.com/claim/{address}',
      };

      const { UNSAFE_getByType } = render(
        <RewardItem
          reward={mockReward}
          seasonReward={seasonRewardWithClaimUrl}
          isLocked={false}
        />,
      );

      const touchableOpacity = UNSAFE_getByType(TouchableOpacity);
      touchableOpacity.props.onPress?.();

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_CLAIM_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          claimUrl: 'https://example.com/claim/0x123',
        }),
      );
    });

    it('passes undefined claimUrl when seasonReward has no claimUrl', () => {
      const seasonRewardWithoutClaimUrl: SeasonRewardDto = {
        ...mockSeasonReward,
        claimUrl: undefined,
      };

      const { UNSAFE_getByType } = render(
        <RewardItem
          reward={mockReward}
          seasonReward={seasonRewardWithoutClaimUrl}
          isLocked={false}
        />,
      );

      const touchableOpacity = UNSAFE_getByType(TouchableOpacity);
      touchableOpacity.props.onPress?.();

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_CLAIM_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          claimUrl: undefined,
        }),
      );
    });

    it('passes undefined claimUrl when no account address is available', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectRewardsActiveAccountAddress) return undefined;
        return undefined;
      });

      const seasonRewardWithClaimUrl: SeasonRewardDto = {
        ...mockSeasonReward,
        claimUrl: 'https://example.com/claim/{address}',
      };

      const { UNSAFE_getByType } = render(
        <RewardItem
          reward={mockReward}
          seasonReward={seasonRewardWithClaimUrl}
          isLocked={false}
        />,
      );

      const touchableOpacity = UNSAFE_getByType(TouchableOpacity);
      touchableOpacity.props.onPress?.();

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_CLAIM_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          claimUrl: undefined,
        }),
      );
    });
  });
});
