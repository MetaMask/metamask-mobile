import React, { useCallback, useMemo } from 'react';
import {
  PointsBoostRewardData,
  RewardClaimStatus,
  RewardDto,
  SeasonRewardDto,
  SeasonRewardType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { formatTimeRemaining, getIconName } from '../../utils/formatUtils';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  Button,
  ButtonVariant,
  ButtonSize,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { TouchableOpacity } from 'react-native';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import { selectRewardsActiveAccountAddress } from '../../../../../selectors/rewards';

interface RewardItemProps {
  reward?: RewardDto;
  seasonReward: SeasonRewardDto;
  isLast?: boolean;
  isLocked?: boolean;
  isEndOfSeasonReward?: boolean;
  endOfSeasonClaimedDescription?: string;
  compact?: boolean;
  onPress?: (reward: RewardDto, seasonReward: SeasonRewardDto) => void;
  claimCtaLabel?: string;
}

const RewardItem: React.FC<RewardItemProps> = ({
  reward,
  seasonReward,
  isLast = false,
  isLocked = true,
  isEndOfSeasonReward = false,
  endOfSeasonClaimedDescription,
  compact = false,
  onPress,
  claimCtaLabel,
}) => {
  const hasClaimed = reward?.claimStatus === RewardClaimStatus.CLAIMED;
  const isSeasonRewardClaimExpired = useMemo(() => {
    if (
      seasonReward.claimEndDate &&
      new Date(seasonReward.claimEndDate) < new Date()
    ) {
      return true;
    }
    return false;
  }, [seasonReward.claimEndDate]);
  const timeRemaining = useMemo(() => {
    // Prefer reward-specific activeUntil if available
    const pointsBoostActiveUntil = (
      reward?.claim?.data as PointsBoostRewardData
    )?.activeUntil;
    if (pointsBoostActiveUntil) {
      return formatTimeRemaining(new Date(pointsBoostActiveUntil));
    }
    // Fallback to seasonReward.claimEndDate if present
    if (
      isEndOfSeasonReward &&
      seasonReward.claimEndDate &&
      !isSeasonRewardClaimExpired
    ) {
      return formatTimeRemaining(new Date(seasonReward.claimEndDate));
    }
    return null;
  }, [
    reward?.claim?.data,
    seasonReward.claimEndDate,
    isSeasonRewardClaimExpired,
    isEndOfSeasonReward,
  ]);

  const hasExpired = useMemo(() => {
    if (isSeasonRewardClaimExpired) {
      return true;
    }
    if (!(reward?.claim?.data as PointsBoostRewardData)?.activeUntil) {
      return false;
    }
    return (
      new Date((reward?.claim?.data as PointsBoostRewardData)?.activeUntil) <
      new Date()
    );
  }, [reward?.claim?.data, isSeasonRewardClaimExpired]);

  /**
   * Renders a time/status indicator with icon and text
   * Handles expired, time remaining, and custom description cases
   */
  const renderTimeStatusIndicator = useCallback(
    (options: {
      isExpired?: boolean;
      remainingTime?: string | null;
      descriptionText?: string;
    }): React.ReactNode => {
      const { isExpired, remainingTime, descriptionText } = options;

      // If expired, show expired indicator
      if (isExpired) {
        return (
          <Box twClassName="gap-1 flex-row items-center">
            <Icon
              name={IconName.Clock}
              size={IconSize.Sm}
              twClassName="text-text-alternative"
            />
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              twClassName="text-text-alternative"
            >
              {strings('rewards.unlocked_rewards.expired')}
            </Text>
          </Box>
        );
      }

      // If time remaining, show time left indicator
      if (remainingTime) {
        return (
          <Box twClassName="gap-1 flex-row items-center">
            <Icon
              name={IconName.Clock}
              size={IconSize.Sm}
              twClassName="text-text-alternative"
            />
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              twClassName="text-text-alternative"
            >
              {remainingTime} {strings('rewards.unlocked_rewards.time_left')}
            </Text>
          </Box>
        );
      }

      if (descriptionText) {
        return (
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            twClassName="text-text-alternative"
          >
            {descriptionText}
          </Text>
        );
      }

      return null;
    },
    [],
  );

  const shortDescription = useMemo(() => {
    // End of season rewards: show time status or description
    if (isEndOfSeasonReward) {
      if (hasClaimed) {
        return (
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            twClassName="text-text-alternative"
          >
            {endOfSeasonClaimedDescription ||
              strings('rewards.unlocked_rewards.claimed_label')}
          </Text>
        );
      } else if (isSeasonRewardClaimExpired) {
        return (
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            twClassName="text-text-alternative"
          >
            {strings('rewards.unlocked_rewards.expired')}
          </Text>
        );
      } else if (isLocked) {
        return (
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            twClassName="text-text-alternative"
          >
            {strings('rewards.end_of_season_rewards.check_back_soon')}
          </Text>
        );
      }

      return renderTimeStatusIndicator({
        isExpired: hasExpired,
        remainingTime: timeRemaining,
        descriptionText:
          seasonReward.endOfSeasonShortDescription ||
          seasonReward.shortDescription,
      });
    }

    if (isLocked) {
      return (
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          twClassName="text-text-alternative"
        >
          {seasonReward.shortDescription}
        </Text>
      );
    }

    if (hasClaimed) {
      // Check for expired or time remaining status
      const timeStatus = renderTimeStatusIndicator({
        isExpired: hasExpired,
        remainingTime: timeRemaining,
      });
      if (timeStatus) {
        return timeStatus;
      }

      // show 'Claimed' for rewards that requires claim
      if (
        seasonReward.rewardType === SeasonRewardType.POINTS_BOOST ||
        seasonReward.rewardType === SeasonRewardType.ALPHA_FOX_INVITE
      ) {
        return (
          <Box twClassName="gap-1 flex-row items-center">
            <Icon
              name={IconName.Confirmation}
              size={IconSize.Sm}
              twClassName="text-text-alternative"
            />
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              twClassName="text-text-alternative"
            >
              {strings('rewards.unlocked_rewards.claimed_label')}
            </Text>
          </Box>
        );
      }
      // Keep subtext for rewards that do not requires claim
      return (
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          twClassName="text-text-alternative"
        >
          {seasonReward.shortUnlockedDescription}
        </Text>
      );
    }

    return (
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        twClassName="text-text-alternative"
      >
        {seasonReward.shortUnlockedDescription}
      </Text>
    );
  }, [
    isEndOfSeasonReward,
    seasonReward.endOfSeasonShortDescription,
    seasonReward.shortUnlockedDescription,
    seasonReward.shortDescription,
    seasonReward.rewardType,
    isLocked,
    hasClaimed,
    hasExpired,
    timeRemaining,
    renderTimeStatusIndicator,
    isSeasonRewardClaimExpired,
    endOfSeasonClaimedDescription,
  ]);

  const longDescription = isLocked
    ? seasonReward.longDescription
    : seasonReward.longUnlockedDescription;

  const navigation = useNavigation();
  const currentAccountAddress = useSelector(selectRewardsActiveAccountAddress);

  const rewardInputAction = useMemo(() => {
    if (isLocked || hasClaimed) {
      return false;
    }
    switch (seasonReward.rewardType) {
      case SeasonRewardType.ALPHA_FOX_INVITE:
        return true;
      default:
        return false;
    }
  }, [hasClaimed, isLocked, seasonReward.rewardType]);

  const rewardInputPlaceholder = useMemo(() => {
    switch (seasonReward.rewardType) {
      case SeasonRewardType.ALPHA_FOX_INVITE:
        return strings(
          'rewards.upcoming_rewards.alpha_fox_invite_input_placeholder',
        );
      default:
        return '';
    }
  }, [seasonReward.rewardType]);

  const rewardClaimUrl = useMemo(() => {
    if (isLocked || !currentAccountAddress || !seasonReward.claimUrl)
      return undefined;
    return seasonReward.claimUrl.replace(
      '{address}',
      currentAccountAddress || '',
    );
  }, [isLocked, currentAccountAddress, seasonReward.claimUrl]);

  const handleRewardItemPress = useCallback(() => {
    if (isLocked || hasClaimed || isSeasonRewardClaimExpired) return;

    if (onPress && reward) {
      onPress(reward, seasonReward);
      return;
    }

    navigation.navigate(Routes.MODAL.REWARDS_CLAIM_BOTTOM_SHEET_MODAL, {
      title: seasonReward.name,
      icon: getIconName(seasonReward.iconName),
      description: longDescription,
      claimUrl: rewardClaimUrl,
      showInput: rewardInputAction,
      inputPlaceholder: rewardInputPlaceholder,
      rewardId: reward?.id,
      seasonRewardId: seasonReward.id,
      rewardType: seasonReward.rewardType,
      isLocked,
      hasClaimed,
    });
  }, [
    isLocked,
    hasClaimed,
    isSeasonRewardClaimExpired,
    onPress,
    navigation,
    seasonReward,
    longDescription,
    rewardClaimUrl,
    rewardInputAction,
    rewardInputPlaceholder,
    reward,
  ]);

  return (
    <TouchableOpacity
      disabled={isLocked || hasClaimed || isSeasonRewardClaimExpired}
      onPress={handleRewardItemPress}
    >
      <Box
        twClassName={`flex-row items-center ${compact ? 'py-2' : 'py-3 px-4'} gap-4 ${
          isLast || compact ? '' : 'border-b border-muted'
        }`}
      >
        {/* Reward Icon */}
        <Box
          twClassName={`h-12 w-12 rounded-full bg-muted items-center justify-center`}
          testID={REWARDS_VIEW_SELECTORS.TIER_REWARD_ICON}
        >
          <Icon
            name={getIconName(seasonReward.iconName)}
            size={IconSize.Lg}
            twClassName="text-icon-alternative"
          />
        </Box>

        {/* Reward Info */}
        <Box twClassName="flex-1">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="text-text-default"
            testID={REWARDS_VIEW_SELECTORS.TIER_REWARD_NAME}
          >
            {isEndOfSeasonReward && seasonReward.endOfSeasonName
              ? seasonReward.endOfSeasonName
              : seasonReward.name}
          </Text>
          <Box testID={REWARDS_VIEW_SELECTORS.TIER_REWARD_DESCRIPTION}>
            {shortDescription}
          </Box>
        </Box>

        {/* Claim Button - hidden when locked, already claimed, or end of season reward claim period has expired */}
        {!isLocked &&
          !hasClaimed &&
          !isSeasonRewardClaimExpired &&
          (isEndOfSeasonReward ? (
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Sm}
              twClassName="text-text-alternative mr-1"
            />
          ) : (
            <Button
              variant={
                isEndOfSeasonReward
                  ? ButtonVariant.Primary
                  : ButtonVariant.Secondary
              }
              size={isEndOfSeasonReward ? ButtonSize.Md : ButtonSize.Sm}
              onPress={(e) => {
                e.stopPropagation();
                handleRewardItemPress();
              }}
              testID={REWARDS_VIEW_SELECTORS.TIER_REWARD_CLAIM_BUTTON}
            >
              {claimCtaLabel || strings('rewards.unlocked_rewards.claim_label')}
            </Button>
          ))}
      </Box>
    </TouchableOpacity>
  );
};

export default RewardItem;
