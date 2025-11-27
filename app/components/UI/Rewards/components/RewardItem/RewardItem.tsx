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
  canPressToNavigateToInfo?: boolean;
  isEndOfSeasonReward?: boolean;
}

const RewardItem: React.FC<RewardItemProps> = ({
  reward,
  seasonReward,
  isLast = false,
  canPressToNavigateToInfo = true,
  isLocked = true,
  isEndOfSeasonReward = false,
}) => {
  const hasClaimed = reward?.claimStatus === RewardClaimStatus.CLAIMED;
  const timeRemaining = (reward?.claim?.data as PointsBoostRewardData)
    ?.activeUntil
    ? formatTimeRemaining(
        new Date((reward?.claim?.data as PointsBoostRewardData)?.activeUntil),
      )
    : null;

  const hasExpired = useMemo(() => {
    if (!(reward?.claim?.data as PointsBoostRewardData)?.activeUntil) {
      return false;
    }
    return (
      new Date((reward?.claim?.data as PointsBoostRewardData)?.activeUntil) <
      new Date()
    );
  }, [reward?.claim?.data]);

  const shortDescription = useMemo(() => {
    if (isEndOfSeasonReward && seasonReward.endOfSeasonShortDescription) {
      return (
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          twClassName="text-text-alternative"
        >
          {seasonReward.endOfSeasonShortDescription}
        </Text>
      );
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
      // If expired, show expired
      if (hasExpired) {
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
      if (timeRemaining) {
        // Return time left for time-limited rewards
        return (
          <Box twClassName="gap-1 flex-row items-center">
            <Icon
              name={IconName.Clock}
              size={IconSize.Sm}
              twClassName="text-warning-default"
            />
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              twClassName="text-warning-default"
            >
              {timeRemaining} {strings('rewards.unlocked_rewards.time_left')}
            </Text>
          </Box>
        );
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
    if (!canPressToNavigateToInfo) return;
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
    canPressToNavigateToInfo,
    navigation,
    seasonReward.name,
    seasonReward.iconName,
    seasonReward.rewardType,
    seasonReward.id,
    longDescription,
    rewardClaimUrl,
    rewardInputAction,
    rewardInputPlaceholder,
    reward?.id,
    isLocked,
    hasClaimed,
  ]);

  return (
    <TouchableOpacity
      disabled={!canPressToNavigateToInfo}
      onPress={handleRewardItemPress}
    >
      <Box
        twClassName={`flex-row items-center py-3 px-4 gap-4 ${
          !isLast ? 'border-b border-muted' : ''
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
            twClassName="text-text-default mb-1"
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

        {/* Claim Button */}
        {!isLocked && !hasClaimed && (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={(e) => {
              e.stopPropagation();
              handleRewardItemPress();
            }}
            testID={REWARDS_VIEW_SELECTORS.TIER_REWARD_CLAIM_BUTTON}
          >
            {strings('rewards.unlocked_rewards.claim_label')}
          </Button>
        )}
      </Box>
    </TouchableOpacity>
  );
};

export default RewardItem;
