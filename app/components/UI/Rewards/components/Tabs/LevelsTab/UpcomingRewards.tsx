import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { Image, TouchableOpacity, Animated } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../util/theme';
import {
  selectSeasonTiers,
  selectCurrentTier,
} from '../../../../../../reducers/rewards/selectors';
import {
  SeasonTierDto,
  SeasonRewardDto,
  SeasonRewardType,
  RewardClaimStatus,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../../locales/i18n';
import { AppThemeKey } from '../../../../../../util/theme/models';
import { formatNumber, getIconName } from '../../../utils/formatUtils';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import { ModalType } from '../../RewardsBottomSheetModal';
import { selectRewardsActiveAccountAddress } from '../../../../../../selectors/rewards';

interface TierAccordionProps {
  tier: SeasonTierDto;
  isExpanded: boolean;
  onToggle: () => void;
}

interface RewardItemProps {
  reward: SeasonRewardDto;
  isLast?: boolean;
  isLocked?: boolean;
  claimStatus?: RewardClaimStatus;
}

const RewardItemBottomSheetTitle = ({
  title,
  icon,
}: {
  title: string;
  icon: IconName;
}) => (
  <Box twClassName="flex-row items-center justify-between w-full">
    <Text variant={TextVariant.HeadingLg} twClassName="w-[80%]">
      {title}
    </Text>
    <Box
      twClassName={`h-12 w-12 rounded-full bg-muted items-center justify-center`}
      testID={REWARDS_VIEW_SELECTORS.TIER_REWARD_ICON}
    >
      <Icon name={icon} size={IconSize.Lg} twClassName="text-primary-default" />
    </Box>
  </Box>
);

const RewardItemBottomSheetDescription = ({
  description,
}: {
  description: string;
}) => (
  <Text variant={TextVariant.BodyMd} twClassName="text-text-alternative">
    {description}
  </Text>
);

export const RewardItem: React.FC<RewardItemProps> = ({
  reward,
  isLast = false,
  isLocked = true,
  claimStatus,
}) => {
  const shortDescription = isLocked
    ? reward.shortDescription
    : reward.shortUnlockedDescription;

  const longDescription = isLocked
    ? reward.longDescription
    : reward.longUnlockedDescription;

  const navigation = useNavigation();
  const currentAccountAddress = useSelector(selectRewardsActiveAccountAddress);

  const rewardInputAction = useMemo(() => {
    if (isLocked) {
      return false;
    }
    switch (reward.rewardType) {
      case SeasonRewardType.ALPHA_FOX_INVITE:
        return true;
      default:
        return false;
    }
  }, [isLocked, reward.rewardType]);

  const rewardInputPlaceholder = useMemo(() => {
    switch (reward.rewardType) {
      case SeasonRewardType.ALPHA_FOX_INVITE:
        return strings(
          'rewards.upcoming_rewards.alpha_fox_invite_input_placeholder',
        );
      default:
        return '';
    }
  }, [reward.rewardType]);

  const rewardClaimUrl = useMemo(() => {
    if (isLocked || !currentAccountAddress || !reward.claimUrl)
      return undefined;
    return reward.claimUrl.replace('{address}', currentAccountAddress || '');
  }, [isLocked, currentAccountAddress, reward.claimUrl]);

  const handleRewardItemPress = useCallback(() => {
    navigation.navigate(Routes.MODAL.REWARDS_CLAIM_BOTTOM_SHEET_MODAL, {
      title: (
        <RewardItemBottomSheetTitle
          title={reward.name}
          icon={getIconName(reward.iconName)}
        />
      ),
      description: (
        <RewardItemBottomSheetDescription description={longDescription} />
      ),
      claimUrl: rewardClaimUrl,
      showIcon: false,
      type: ModalType.Confirmation,
      showInput: rewardInputAction,
      inputPlaceholder: rewardInputPlaceholder,
      showCancelButton: false,
      rewardId: reward.id,
      rewardType: reward.rewardType,
      isLocked,
    });
  }, [
    navigation,
    reward.name,
    reward.iconName,
    reward.id,
    reward.rewardType,
    longDescription,
    rewardClaimUrl,
    rewardInputAction,
    rewardInputPlaceholder,
    isLocked,
  ]);

  return (
    <TouchableOpacity onPress={handleRewardItemPress}>
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
            name={getIconName(reward.iconName)}
            size={IconSize.Lg}
            twClassName="text-icon-alternative"
          />
        </Box>

        {/* Reward Info */}
        <Box twClassName="flex-1">
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-text-default mb-1"
            testID={REWARDS_VIEW_SELECTORS.TIER_REWARD_NAME}
          >
            {reward.name}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-text-alternative"
            testID={REWARDS_VIEW_SELECTORS.TIER_REWARD_DESCRIPTION}
          >
            {shortDescription}
          </Text>
        </Box>

        {/* Claim Button */}
        {claimStatus === RewardClaimStatus.UNCLAIMED && !isLocked && (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={(e) => {
              e.stopPropagation();
              handleRewardItemPress();
            }}
          >
            {strings('rewards.unlocked_rewards.claim_label')}
          </Button>
        )}
      </Box>
    </TouchableOpacity>
  );
};

const TierAccordion: React.FC<TierAccordionProps> = ({
  tier,
  isExpanded,
  onToggle,
}) => {
  const tw = useTailwind();
  const { themeAppearance, brandColors } = useTheme();
  const animatedRotation = useRef(new Animated.Value(0)).current;

  // Get appropriate image URL based on theme
  const imageUrl = useMemo(
    () =>
      themeAppearance === AppThemeKey.light
        ? tier.image?.lightModeUrl
        : tier.image?.darkModeUrl,
    [tier.image, themeAppearance],
  );

  const rewards = useMemo(() => tier.rewards || [], [tier.rewards]);

  // Animate height and rotation when expanded state changes
  useEffect(() => {
    const targetRotation = isExpanded ? 1 : 0;

    Animated.timing(animatedRotation, {
      toValue: targetRotation,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isExpanded, animatedRotation]);

  const rotateInterpolate = animatedRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Box>
      <Box
        twClassName={`flex-row items-center bg-[${
          themeAppearance === AppThemeKey.light
            ? brandColors.grey100
            : brandColors.grey700
        }] py-2 px-4`}
      >
        {/* Tier Image */}
        <Box twClassName="mr-4" testID={REWARDS_VIEW_SELECTORS.TIER_IMAGE}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              resizeMode="contain"
              style={tw.style('h-12 w-12')}
            />
          ) : (
            <Box
              twClassName={`h-12 w-12 rounded-full bg-[${
                themeAppearance === AppThemeKey.light
                  ? brandColors.grey100
                  : brandColors.grey700
              }] items-center justify-center`}
            >
              <Icon
                name={IconName.Star}
                size={IconSize.Md}
                twClassName="text-icon-muted"
              />
            </Box>
          )}
        </Box>

        {/* Tier Info */}
        <Box twClassName="flex-1">
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-text-default"
            testID={REWARDS_VIEW_SELECTORS.TIER_NAME}
          >
            {tier.levelNumber} • {tier.name}
          </Text>
          <Box
            twClassName="flex-row items-center gap-1"
            testID={REWARDS_VIEW_SELECTORS.TIER_POINTS_NEEDED}
          >
            <Icon
              name={IconName.Lock}
              size={IconSize.Sm}
              twClassName="text-icon-alternative"
            />
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-text-alternative"
            >
              {strings('rewards.upcoming_rewards.points_needed', {
                points: formatNumber(tier.pointsNeeded),
              })}
            </Text>
          </Box>
        </Box>

        {/* Expand/Collapse Button */}
        {rewards.length > 0 && (
          <TouchableOpacity onPress={onToggle}>
            <Box twClassName="ml-4 p-2">
              <Animated.View
                style={{
                  transform: [{ rotate: rotateInterpolate }],
                }}
              >
                <Icon
                  name={IconName.ArrowDown}
                  size={IconSize.Md}
                  twClassName="text-icon-default"
                />
              </Animated.View>
            </Box>
          </TouchableOpacity>
        )}
      </Box>

      {/* Expandable Rewards List */}
      {rewards.length > 0 && isExpanded && (
        <Box
          twClassName="bg-background-muted"
          testID={REWARDS_VIEW_SELECTORS.TIER_REWARDS}
        >
          {rewards.map((reward: SeasonRewardDto, index: number) => (
            <RewardItem
              key={reward.id}
              reward={reward}
              isLast={index === rewards.length - 1}
              isLocked
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

const UpcomingRewards: React.FC = () => {
  const seasonTiers = useSelector(selectSeasonTiers) as SeasonTierDto[];
  const currentTier = useSelector(selectCurrentTier);

  // Filter tiers to show only those above current tier
  const upcomingTiers = useMemo(() => {
    if (!currentTier) {
      return seasonTiers.filter(
        (tier) => tier.rewards && tier.rewards.length > 0,
      );
    }

    return seasonTiers.filter(
      (tier) => tier.pointsNeeded > currentTier.pointsNeeded,
    );
  }, [seasonTiers, currentTier]);

  // Initialize with all upcoming tiers expanded by default
  const [expandedTiers, setExpandedTiers] = React.useState<Set<string>>(
    () => new Set(upcomingTiers.map((tier) => tier.id)),
  );

  const handleTierToggle = (tierId: string) => {
    setExpandedTiers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tierId)) {
        newSet.delete(tierId);
      } else {
        newSet.add(tierId);
      }
      return newSet;
    });
  };

  if (!upcomingTiers.length) {
    return null;
  }

  return (
    <Box twClassName="py-4">
      {/* Section Title */}
      <Box twClassName="mb-4">
        <Text variant={TextVariant.HeadingMd}>
          {strings('rewards.upcoming_rewards.title')}
        </Text>
      </Box>

      {/* Tier Accordions */}
      <Box twClassName="rounded-xl overflow-hidden">
        {upcomingTiers.map((tier) => (
          <TierAccordion
            key={tier.id}
            tier={tier}
            isExpanded={expandedTiers.has(tier.id)}
            onToggle={() => handleTierToggle(tier.id)}
          />
        ))}
      </Box>
    </Box>
  );
};

export default UpcomingRewards;
