import React, { useMemo } from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { formatCompactUsd, formatUsd } from '../../utils/formatUtils';
import { strings } from '../../../../../../locales/i18n';

export const ONDO_PRIZE_POOL_TEST_IDS = {
  CONTAINER: 'ondo-prize-pool-container',
  PROGRESS_BAR: 'ondo-prize-pool-progress-bar',
  SUBTEXT: 'ondo-prize-pool-subtext',
  ERROR_BANNER: 'ondo-prize-pool-error-banner',
} as const;

const BREAKPOINTS = [
  { deposit: 0, prize: 25_000 },
  { deposit: 1_500_000, prize: 50_000 },
  { deposit: 3_500_000, prize: 75_000 },
  { deposit: 6_000_000, prize: 100_000 },
] as const;

function computeProgress(totalDeposited: number) {
  let currentIndex = 0;
  for (let i = BREAKPOINTS.length - 1; i >= 0; i--) {
    if (totalDeposited >= BREAKPOINTS[i].deposit) {
      currentIndex = i;
      break;
    }
  }

  const current = BREAKPOINTS[currentIndex];
  const next = BREAKPOINTS[currentIndex + 1];

  if (!next) {
    return {
      progress: 1,
      currentPrize: current.prize,
      nextPrize: null,
      nextThreshold: current.deposit,
      isMaxTier: true,
    };
  }

  const rangeDeposit = next.deposit - current.deposit;
  const progressInRange = totalDeposited - current.deposit;
  const progress = Math.min(progressInRange / rangeDeposit, 1);

  return {
    progress,
    currentPrize: current.prize,
    nextPrize: next.prize,
    nextThreshold: next.deposit,
    isMaxTier: false,
  };
}

interface OndoPrizePoolProps {
  totalUsdDeposited: string | null;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => void;
}

const OndoPrizePool: React.FC<OndoPrizePoolProps> = ({
  totalUsdDeposited,
  isLoading,
  hasError,
  refetch,
}) => {
  const tw = useTailwind();

  const showSkeleton = isLoading && !totalUsdDeposited;
  const showError = hasError && !totalUsdDeposited;

  const { progress, currentPrize, nextPrize, nextThreshold, isMaxTier } =
    useMemo(() => {
      if (!totalUsdDeposited) {
        return {
          progress: 0,
          currentPrize: 25_000,
          nextPrize: 50_000 as number | null,
          nextThreshold: 1_500_000,
          isMaxTier: false,
        };
      }
      return computeProgress(parseFloat(totalUsdDeposited));
    }, [totalUsdDeposited]);

  const progressPercent = `${Math.round(progress * 100)}%`;
  const deposited = totalUsdDeposited ? parseFloat(totalUsdDeposited) : 0;

  if (showError) {
    return (
      <Box testID={ONDO_PRIZE_POOL_TEST_IDS.CONTAINER} twClassName="mt-2">
        <RewardsErrorBanner
          title={strings('rewards.ondo_campaign_prize_pool.error_title')}
          description={strings(
            'rewards.ondo_campaign_prize_pool.error_description',
          )}
          onConfirm={refetch}
          confirmButtonLabel={strings(
            'rewards.ondo_campaign_prize_pool.retry_button',
          )}
          testID={ONDO_PRIZE_POOL_TEST_IDS.ERROR_BANNER}
        />
      </Box>
    );
  }

  if (showSkeleton) {
    return (
      <Box twClassName="gap-2 mt-2" testID={ONDO_PRIZE_POOL_TEST_IDS.CONTAINER}>
        <Skeleton style={tw.style('h-4 rounded-full')} />
        <Skeleton style={tw.style('h-3 w-40 rounded')} />
      </Box>
    );
  }

  return (
    <Box twClassName="gap-2 mt-2" testID={ONDO_PRIZE_POOL_TEST_IDS.CONTAINER}>
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
            {strings('rewards.ondo_campaign_prize_pool.current_label')}
          </Text>
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {formatUsd(currentPrize)}
          </Text>
        </Box>
        {!isMaxTier && nextPrize !== null && (
          <Box alignItems={BoxAlignItems.End}>
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {strings('rewards.ondo_campaign_prize_pool.next_label')}
            </Text>
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {formatUsd(nextPrize)}
            </Text>
          </Box>
        )}
      </Box>

      <Box
        twClassName="h-3 rounded-full bg-muted overflow-hidden"
        testID={ONDO_PRIZE_POOL_TEST_IDS.PROGRESS_BAR}
      >
        <Box
          twClassName="h-full rounded-full bg-success-default"
          style={{ width: progressPercent }}
        />
      </Box>

      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        testID={ONDO_PRIZE_POOL_TEST_IDS.SUBTEXT}
      >
        {isMaxTier
          ? strings('rewards.ondo_campaign_prize_pool.max_tier_subtext', {
              maxThreshold: formatCompactUsd(nextThreshold),
            })
          : strings('rewards.ondo_campaign_prize_pool.volume_subtext', {
              current: formatCompactUsd(deposited),
              target: formatCompactUsd(nextThreshold),
            })}
      </Text>
    </Box>
  );
};

export default OndoPrizePool;
