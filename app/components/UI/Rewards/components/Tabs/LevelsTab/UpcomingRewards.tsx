import React, { useMemo, useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
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
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../../locales/i18n';
import { AppThemeKey } from '../../../../../../util/theme/models';
import { formatNumber } from '../../../utils/formatUtils';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import RewardItem from './RewardItem';
import RewardsThemeImageComponent from '../../ThemeImageComponent';
import BannerAlert from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../../../../component-library/components/Banners/Banner';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';

interface TierAccordionProps {
  tier: SeasonTierDto;
  isExpanded: boolean;
  onToggle: () => void;
}

const TierAccordion: React.FC<TierAccordionProps> = ({
  tier,
  isExpanded,
  onToggle,
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
    <Box twClassName="flex-row items-center gap-2 items-center">
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
            />
          ))}
        </Box>
      );
    }

    return <></>;
  };

  return (
    <Box twClassName="py-4 gap-4">
      {/* Always show section header */}
      <SectionHeader
        count={totalUpcomingRewardsCount}
        isLoading={isLoading && !hasError}
      />

      {/* Show error banner if there's an error */}
      {hasError && !seasonStartDate && !isLoading && (
        <BannerAlert
          severity={BannerAlertSeverity.Error}
          title={strings('rewards.upcoming_rewards_error.error_fetching_title')}
          description={strings(
            'rewards.upcoming_rewards_error.error_fetching_description',
          )}
        />
      )}

      {renderMainContent()}
    </Box>
  );
};

export default UpcomingRewards;
