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
import RewardsErrorBanner from '../RewardsErrorBanner';
import { formatCompactUsd, formatUsd } from '../../utils/formatUtils';
import { strings } from '../../../../../../locales/i18n';

export const PERPS_PRIZE_POOL_TEST_IDS = {
  CONTAINER: 'perps-prize-pool-container',
  PROGRESS_BAR: 'perps-prize-pool-progress-bar',
  MAX_BADGE: 'perps-prize-pool-max-badge',
  SUBTEXT: 'perps-prize-pool-subtext',
  ERROR_BANNER: 'perps-prize-pool-error-banner',
} as const;

// $10k base prize, scales by $5k per $5M notional volume, up to $50k at $40M
export const PERPS_PRIZE_POOL_MILESTONES = [
  { notionalVolume: 0, prize: 10_000 },
  { notionalVolume: 5_000_000, prize: 15_000 },
  { notionalVolume: 10_000_000, prize: 20_000 },
  { notionalVolume: 15_000_000, prize: 25_000 },
  { notionalVolume: 20_000_000, prize: 30_000 },
  { notionalVolume: 25_000_000, prize: 35_000 },
  { notionalVolume: 30_000_000, prize: 40_000 },
  { notionalVolume: 35_000_000, prize: 45_000 },
  { notionalVolume: 40_000_000, prize: 50_000 },
] as const;

function computeProgress(
  milestones: readonly { notionalVolume: number; prize: number }[],
  currentNotionalVolume: number,
) {
  let currentIndex = 0;
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (currentNotionalVolume >= milestones[i].notionalVolume) {
      currentIndex = i;
      break;
    }
  }

  const current = milestones[currentIndex];
  const next = milestones[currentIndex + 1];

  if (!next) {
    return {
      progress: 1,
      currentPrize: current.prize,
      nextPrize: null as number | null,
      nextThreshold: current.notionalVolume,
      isMaxTier: true,
    };
  }

  const rangeVolume = next.notionalVolume - current.notionalVolume;
  const progressInRange = currentNotionalVolume - current.notionalVolume;
  const progress = Math.min(progressInRange / rangeVolume, 1);

  return {
    progress,
    currentPrize: current.prize,
    nextPrize: next.prize as number | null,
    nextThreshold: next.notionalVolume,
    isMaxTier: false,
  };
}

interface PerpsTradingCampaignPrizePoolProps {
  totalNotionalVolume: string | null;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => void;
}

const PerpsTradingCampaignPrizePool: React.FC<
  PerpsTradingCampaignPrizePoolProps
> = ({ totalNotionalVolume, isLoading, hasError, refetch }) => {
  const tw = useTailwind();

  const showSkeleton = isLoading && !totalNotionalVolume;
  const showError = hasError && !totalNotionalVolume;

  const { progress, currentPrize, nextPrize, nextThreshold, isMaxTier } =
    useMemo(() => {
      if (!totalNotionalVolume) {
        return {
          progress: 0,
          currentPrize: PERPS_PRIZE_POOL_MILESTONES[0].prize,
          nextPrize: PERPS_PRIZE_POOL_MILESTONES[1].prize as number | null,
          nextThreshold: PERPS_PRIZE_POOL_MILESTONES[1].notionalVolume,
          isMaxTier: false,
        };
      }
      return computeProgress(
        PERPS_PRIZE_POOL_MILESTONES,
        parseFloat(totalNotionalVolume),
      );
    }, [totalNotionalVolume]);

  const progressPercent = `${Math.round(progress * 100)}%`;
  const currentVolume = totalNotionalVolume
    ? parseFloat(totalNotionalVolume)
    : 0;

  if (showError) {
    return (
      <Box testID={PERPS_PRIZE_POOL_TEST_IDS.CONTAINER} twClassName="mt-2">
        <RewardsErrorBanner
          title={strings(
            'rewards.perps_trading_campaign.prize_pool_error_title',
          )}
          onConfirm={refetch}
          confirmButtonLabel={strings(
            'rewards.perps_trading_campaign.prize_pool_retry_button',
          )}
          testID={PERPS_PRIZE_POOL_TEST_IDS.ERROR_BANNER}
        />
      </Box>
    );
  }

  if (showSkeleton) {
    return (
      <Box
        twClassName="gap-2 mt-2"
        testID={PERPS_PRIZE_POOL_TEST_IDS.CONTAINER}
      >
        <Skeleton style={tw.style('h-4 rounded-full')} />
        <Skeleton style={tw.style('h-3 w-40 rounded')} />
      </Box>
    );
  }

  return (
    <Box twClassName="gap-2 mt-2" testID={PERPS_PRIZE_POOL_TEST_IDS.CONTAINER}>
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
            {strings('rewards.perps_trading_campaign.prize_pool_current_label')}
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
              testID={PERPS_PRIZE_POOL_TEST_IDS.MAX_BADGE}
            >
              <Text
                variant={TextVariant.BodyXs}
                fontWeight={FontWeight.Medium}
                color={TextColor.SuccessDefault}
              >
                {strings('rewards.perps_trading_campaign.prize_pool_max_badge')}
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
              {strings('rewards.perps_trading_campaign.prize_pool_next_label')}
            </Text>
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {formatUsd(nextPrize)}
            </Text>
          </Box>
        ) : null}
      </Box>

      <Box
        twClassName="h-3 rounded-full bg-muted overflow-hidden"
        testID={PERPS_PRIZE_POOL_TEST_IDS.PROGRESS_BAR}
      >
        <Box
          twClassName="h-full rounded-full bg-success-default"
          style={{ width: progressPercent }}
        />
      </Box>

      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        testID={PERPS_PRIZE_POOL_TEST_IDS.SUBTEXT}
      >
        {strings('rewards.perps_trading_campaign.prize_pool_volume_subtext', {
          current: formatCompactUsd(currentVolume),
          target: formatCompactUsd(nextThreshold),
        })}
      </Text>
    </Box>
  );
};

export default PerpsTradingCampaignPrizePool;
