import React, { useMemo, useRef, useEffect, useState } from 'react';
import { TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../util/theme';
import {
  selectSeasonTiers,
  selectCurrentTier,
  selectSeasonStatusLoading,
  selectSeasonStatusError,
  selectSeasonStartDate,
} from '../../../../../../reducers/rewards/selectors';
import {
  SeasonTierDto,
  SeasonRewardDto,
  ThemeImage,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../../locales/i18n';
import { AppThemeKey } from '../../../../../../util/theme/models';
import { formatNumber } from '../../../utils/formatUtils';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import RewardItem from '../../RewardItem/RewardItem';
import RewardsThemeImageComponent from '../../ThemeImageComponent';
import RewardsErrorBanner from '../../RewardsErrorBanner';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';
import RewardsImageModal from '../../RewardsImageModal';
import fallbackTierImage from '../../../../../../images/rewards/tiers/rewards-s1-tier-1.png';

interface TierAccordionProps {
  tier: SeasonTierDto;
  isExpanded: boolean;
  onToggle: () => void;
  onImagePress: (image?: ThemeImage) => void;
}

const TierAccordion: React.FC<TierAccordionProps> = ({
  tier,
  isExpanded,
  onToggle,
  onImagePress,
}) => {
  const tw = useTailwind();
  const { themeAppearance, brandColors } = useTheme();
  const animatedRotation = useRef(new Animated.Value(0)).current;

  const seasonRewards = useMemo(() => tier.rewards || [], [tier.rewards]);

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
          <TouchableOpacity
            onPress={() => onImagePress(tier.image)}
            activeOpacity={0.7}
            disabled={!tier.image}
          >
            {tier.image ? (
              <RewardsThemeImageComponent
                themeImage={tier.image}
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
          </TouchableOpacity>
        </Box>

        {/* Tier Info */}
        <Box twClassName="flex-1">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
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
              fontWeight={FontWeight.Medium}
              twClassName="text-text-alternative"
            >
              {strings('rewards.upcoming_rewards.points_needed', {
                points: formatNumber(tier.pointsNeeded),
              })}
            </Text>
          </Box>
        </Box>

        {/* Expand/Collapse Button */}
        {seasonRewards.length > 0 && (
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
      {seasonRewards.length > 0 && isExpanded && (
        <Box
          twClassName="bg-background-muted"
          testID={REWARDS_VIEW_SELECTORS.TIER_REWARDS}
        >
          {seasonRewards.map((seasonReward: SeasonRewardDto, index: number) => (
            <RewardItem
              key={seasonReward.id}
              seasonReward={seasonReward}
              isLast={index === seasonRewards.length - 1}
              isLocked
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

const SectionHeader: React.FC<{ count: number | null; isLoading: boolean }> = ({
  count,
  isLoading,
}) => (
  <Box>
    <Box twClassName="flex-row items-center gap-2">
      <Text variant={TextVariant.HeadingMd} twClassName="text-default">
        {strings('rewards.upcoming_rewards.title')}
      </Text>
      {isLoading && <ActivityIndicator size="small" />}
      {count !== null && !isLoading && (
        <Box twClassName="bg-text-muted rounded-lg w-6 h-6 items-center justify-center">
          <Text variant={TextVariant.BodySm} twClassName="text-default">
            {count}
          </Text>
        </Box>
      )}
    </Box>
  </Box>
);

const UpcomingRewards: React.FC = () => {
  const tw = useTailwind();
  const seasonTiers = useSelector(selectSeasonTiers) as SeasonTierDto[];
  const currentTier = useSelector(selectCurrentTier);
  const seasonStartDate = useSelector(selectSeasonStartDate);
  const isLoading = useSelector(selectSeasonStatusLoading);
  const hasError = useSelector(selectSeasonStatusError);

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

  // Modal state for expanded image
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ThemeImage | undefined>(
    undefined,
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

  const handleImagePress = (image?: ThemeImage) => {
    if (image) {
      setSelectedImage(image);
      setIsImageExpanded(true);
    }
  };

  const handleCloseModal = () => {
    setIsImageExpanded(false);
    setSelectedImage(undefined);
  };

  const totalUpcomingRewardsCount = useMemo(
    () =>
      seasonStartDate != null
        ? upcomingTiers.reduce((acc, tier) => acc + tier.rewards.length, 0)
        : null,
    [upcomingTiers, seasonStartDate],
  );

  if (
    seasonStartDate != null &&
    !upcomingTiers?.length &&
    !hasError &&
    !isLoading
  ) {
    // Not pending and empty, shouldn't happen but in this case nothing is returned.
    return null;
  }

  const renderMainContent = () => {
    const shouldShowSkeleton =
      (isLoading || seasonStartDate === null) &&
      !upcomingTiers?.length &&
      !hasError;

    if (shouldShowSkeleton) {
      return <Skeleton style={tw.style('h-32 bg-rounded')} />;
    }

    if (upcomingTiers?.length) {
      return (
        <Box twClassName="rounded-xl overflow-hidden">
          {upcomingTiers.map((tier) => (
            <TierAccordion
              key={tier.id}
              tier={tier}
              isExpanded={expandedTiers.has(tier.id)}
              onToggle={() => handleTierToggle(tier.id)}
              onImagePress={handleImagePress}
            />
          ))}
        </Box>
      );
    }

    return <></>;
  };

  return (
    <Box twClassName="pt-2 pb-4 px-4 gap-4">
      {/* Always show section header */}
      <SectionHeader
        count={totalUpcomingRewardsCount}
        isLoading={isLoading && !hasError}
      />

      {/* Show error banner if there's an error */}
      {hasError && !seasonStartDate && !isLoading && (
        <RewardsErrorBanner
          title={strings('rewards.upcoming_rewards_error.error_fetching_title')}
          description={strings(
            'rewards.upcoming_rewards_error.error_fetching_description',
          )}
        />
      )}

      {renderMainContent()}

      {/* Full-screen image modal */}
      <RewardsImageModal
        visible={isImageExpanded}
        onClose={handleCloseModal}
        themeImage={selectedImage}
        fallbackImage={fallbackTierImage}
      />
    </Box>
  );
};

export default UpcomingRewards;
