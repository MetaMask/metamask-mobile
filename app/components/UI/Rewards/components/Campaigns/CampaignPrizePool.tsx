import React, { useMemo } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { formatCompactUsd, formatUsd } from '../../utils/formatUtils';
import {
  computePrizePoolProgress,
  hasPrizePoolContent,
} from '../../utils/prizePoolUtils';

export const CAMPAIGN_PRIZE_POOL_TEST_IDS = {
  CONTAINER: 'campaign-prize-pool-container',
  PROGRESS_BAR: 'campaign-prize-pool-progress-bar',
  MAX_BADGE: 'campaign-prize-pool-max-badge',
  SUBTEXT: 'campaign-prize-pool-subtext',
  ERROR_BANNER: 'campaign-prize-pool-error-banner',
} as const;

export interface CampaignPrizePoolSchedule {
  totalVolumeUsd: number;
  unlockedPoolUsd: number;
  thresholdsUsd: readonly number[];
  poolScheduleUsd: readonly number[];
}

interface CampaignPrizePoolMilestone {
  threshold: number;
  prize: number;
}

interface CampaignPrizePoolProps {
  prizePool: CampaignPrizePoolSchedule | null;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => void;
}

const EMPTY_MILESTONE: CampaignPrizePoolMilestone = {
  threshold: 0,
  prize: 0,
};

const buildMilestones = (
  prizePool: CampaignPrizePoolSchedule | null,
): CampaignPrizePoolMilestone[] => {
  if (!prizePool) {
    return [EMPTY_MILESTONE];
  }

  const milestones = prizePool.thresholdsUsd.map((threshold, index) => ({
    threshold,
    prize: prizePool.poolScheduleUsd[index] ?? prizePool.unlockedPoolUsd,
  }));

  if (!milestones.some((milestone) => milestone.threshold === 0)) {
    milestones.unshift({
      threshold: 0,
      prize: prizePool.poolScheduleUsd[0] ?? prizePool.unlockedPoolUsd,
    });
  }

  return milestones;
};

const CampaignPrizePool: React.FC<CampaignPrizePoolProps> = ({
  prizePool,
  isLoading,
  hasError,
  refetch,
}) => {
  const tw = useTailwind();
  const currentVolume = prizePool?.totalVolumeUsd ?? null;
  const showSkeleton = isLoading && prizePool == null;
  const showError = hasError && prizePool == null;

  const sortedMilestones = useMemo(() => {
    const milestones = buildMilestones(prizePool);
    return [...milestones].sort((a, b) => a.threshold - b.threshold);
  }, [prizePool]);

  const { progress, currentPrize, nextPrize, nextThreshold, isMaxTier } =
    useMemo(
      () =>
        computePrizePoolProgress(
          sortedMilestones,
          currentVolume ?? 0,
          (milestone) => milestone.threshold,
        ),
      [currentVolume, sortedMilestones],
    );

  const progressPercent: `${number}%` = `${Math.round(progress * 100)}%`;

  if (showError) {
    return (
      <Box testID={CAMPAIGN_PRIZE_POOL_TEST_IDS.CONTAINER} twClassName="mt-2">
        <RewardsErrorBanner
          title={strings('rewards.campaign_prize_pool.error_title')}
          description={strings('rewards.campaign_prize_pool.error_description')}
          onConfirm={refetch}
          confirmButtonLabel={strings('rewards.campaign_prize_pool.retry')}
          testID={CAMPAIGN_PRIZE_POOL_TEST_IDS.ERROR_BANNER}
        />
      </Box>
    );
  }

  if (showSkeleton) {
    return (
      <Box
        twClassName="gap-2 mt-2"
        testID={CAMPAIGN_PRIZE_POOL_TEST_IDS.CONTAINER}
      >
        <Skeleton style={tw.style('h-4 rounded-full')} />
        <Skeleton style={tw.style('h-3 w-40 rounded')} />
      </Box>
    );
  }

  // No data, and nothing in flight or failed to explain its absence. Rendering
  // the ladder here would state a $0 prize pool as fact, which is a claim about
  // the campaign rather than a missing value.
  if (
    !hasPrizePoolContent({ hasData: prizePool != null, isLoading, hasError })
  ) {
    return null;
  }

  return (
    <Box
      twClassName="gap-2 mt-2"
      testID={CAMPAIGN_PRIZE_POOL_TEST_IDS.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
      >
        <Box>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings('rewards.campaign_prize_pool.current_label')}
          </Text>
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {formatUsd(currentPrize)}
          </Text>
        </Box>
        {isMaxTier ? (
          <Box
            alignItems={BoxAlignItems.End}
            justifyContent={BoxJustifyContent.End}
          >
            <Box
              twClassName="bg-success-muted rounded-[6px] px-1.5"
              testID={CAMPAIGN_PRIZE_POOL_TEST_IDS.MAX_BADGE}
            >
              <Text
                variant={TextVariant.BodyXs}
                fontWeight={FontWeight.Medium}
                color={TextColor.SuccessDefault}
              >
                {strings('rewards.campaign_prize_pool.max_badge')}
              </Text>
            </Box>
          </Box>
        ) : nextPrize !== null ? (
          <Box alignItems={BoxAlignItems.End}>
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {strings('rewards.campaign_prize_pool.next_label')}
            </Text>
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {formatUsd(nextPrize)}
            </Text>
          </Box>
        ) : null}
      </Box>

      <Box
        twClassName="h-3 rounded-full bg-muted overflow-hidden"
        testID={CAMPAIGN_PRIZE_POOL_TEST_IDS.PROGRESS_BAR}
      >
        <Box
          twClassName="h-full rounded-full bg-success-default"
          style={{ width: progressPercent }}
        />
      </Box>

      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        testID={CAMPAIGN_PRIZE_POOL_TEST_IDS.SUBTEXT}
      >
        {isMaxTier
          ? strings('rewards.campaign_prize_pool.max_tier_subtext', {
              maxThreshold: formatCompactUsd(nextThreshold),
            })
          : strings('rewards.campaign_prize_pool.volume_subtext', {
              current: formatCompactUsd(currentVolume ?? 0),
              target: formatCompactUsd(nextThreshold),
            })}
      </Text>
    </Box>
  );
};

export default CampaignPrizePool;
