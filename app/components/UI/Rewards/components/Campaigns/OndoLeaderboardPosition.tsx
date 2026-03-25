import React from 'react';
import {
  Box,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useGetOndoLeaderboardPosition } from '../../hooks/useGetOndoLeaderboardPosition';
import RewardsErrorBanner from '../RewardsErrorBanner';

export const ONDO_LEADERBOARD_POSITION_TEST_IDS = {
  CONTAINER: 'ondo-leaderboard-position-container',
  RANK: 'ondo-leaderboard-position-rank',
  TIER: 'ondo-leaderboard-position-tier',
  RATE_OF_RETURN: 'ondo-leaderboard-position-rate-of-return',
  TOTAL_DEPOSITED: 'ondo-leaderboard-position-total-deposited',
  CURRENT_VALUE: 'ondo-leaderboard-position-current-value',
  COMPUTED_AT: 'ondo-leaderboard-position-computed-at',
  LOADING: 'ondo-leaderboard-position-loading',
  ERROR: 'ondo-leaderboard-position-error',
  NOT_FOUND: 'ondo-leaderboard-position-not-found',
} as const;

interface OndoLeaderboardPositionProps {
  campaignId: string | undefined;
}

const formatRateOfReturn = (rate: number): string => {
  const percentage = rate * 100;
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(2)}%`;
};

const formatUsd = (value: number): string =>
  value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatComputedAt = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'shortOffset',
    });
  } catch {
    return '';
  }
};

const PositionSkeleton: React.FC = () => {
  const tw = useTailwind();
  return (
    <Box
      twClassName="bg-muted rounded-xl p-4 gap-3"
      testID={ONDO_LEADERBOARD_POSITION_TEST_IDS.LOADING}
    >
      <Skeleton style={tw.style('h-5 w-32 rounded-lg')} />
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-4">
        <Skeleton style={tw.style('h-12 w-24 rounded-lg')} />
        <Skeleton style={tw.style('h-12 w-24 rounded-lg')} />
        <Skeleton style={tw.style('h-12 w-24 rounded-lg')} />
      </Box>
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-4">
        <Skeleton style={tw.style('h-12 w-28 rounded-lg')} />
        <Skeleton style={tw.style('h-12 w-28 rounded-lg')} />
      </Box>
      <Skeleton style={tw.style('h-4 w-36 rounded-lg')} />
    </Box>
  );
};

interface StatCellProps {
  label: string;
  value: string;
  valueColor?: TextColor;
  testID?: string;
}

const StatCell: React.FC<StatCellProps> = ({
  label,
  value,
  valueColor = TextColor.TextDefault,
  testID,
}) => (
  <Box twClassName="flex-1">
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.TextAlternative}
      twClassName="mb-1"
    >
      {label}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Bold}
      color={valueColor}
      testID={testID}
    >
      {value}
    </Text>
  </Box>
);

/**
 * OndoLeaderboardPosition displays the current user's position on the
 * Ondo GM campaign leaderboard: rank, tier, rate of return, total deposited,
 * and current USD value.
 */
const OndoLeaderboardPosition: React.FC<OndoLeaderboardPositionProps> = ({
  campaignId,
}) => {
  const { position, isLoading, hasError, refetch } =
    useGetOndoLeaderboardPosition(campaignId);

  if (isLoading && !position) {
    return <PositionSkeleton />;
  }

  if (hasError && !position) {
    return (
      <RewardsErrorBanner
        title={strings('rewards.leaderboard_position.error_loading')}
        description={strings(
          'rewards.leaderboard_position.error_loading_description',
        )}
        onConfirm={refetch}
        confirmButtonLabel={strings('rewards.leaderboard_position.retry')}
        testID={ONDO_LEADERBOARD_POSITION_TEST_IDS.ERROR}
      />
    );
  }

  if (!position) {
    return (
      <Box
        twClassName="bg-muted rounded-xl p-4 items-center"
        testID={ONDO_LEADERBOARD_POSITION_TEST_IDS.NOT_FOUND}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('rewards.leaderboard_position.not_found')}
        </Text>
      </Box>
    );
  }

  const rorColor =
    position.rate_of_return >= 0
      ? TextColor.SuccessDefault
      : TextColor.ErrorDefault;

  return (
    <Box
      twClassName="bg-muted rounded-xl p-4 gap-3"
      testID={ONDO_LEADERBOARD_POSITION_TEST_IDS.CONTAINER}
    >
      <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
        {strings('rewards.leaderboard_position.title')}
      </Text>

      {/* Row 1: Rank | Tier | Rate of Return */}
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-4">
        <StatCell
          label={strings('rewards.leaderboard_position.rank')}
          value={`#${position.rank}`}
          testID={ONDO_LEADERBOARD_POSITION_TEST_IDS.RANK}
        />
        <StatCell
          label={strings('rewards.leaderboard_position.tier')}
          value={position.projected_tier}
          testID={ONDO_LEADERBOARD_POSITION_TEST_IDS.TIER}
        />
        <StatCell
          label={strings('rewards.leaderboard_position.rate_of_return')}
          value={formatRateOfReturn(position.rate_of_return)}
          valueColor={rorColor}
          testID={ONDO_LEADERBOARD_POSITION_TEST_IDS.RATE_OF_RETURN}
        />
      </Box>

      {/* Row 2: Total Deposited | Current Value */}
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-4">
        <StatCell
          label={strings('rewards.leaderboard_position.total_deposited')}
          value={formatUsd(position.total_usd_deposited)}
          testID={ONDO_LEADERBOARD_POSITION_TEST_IDS.TOTAL_DEPOSITED}
        />
        <StatCell
          label={strings('rewards.leaderboard_position.current_value')}
          value={formatUsd(position.current_usd_value)}
          testID={ONDO_LEADERBOARD_POSITION_TEST_IDS.CURRENT_VALUE}
        />
      </Box>

      {/* Last updated */}
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        testID={ONDO_LEADERBOARD_POSITION_TEST_IDS.COMPUTED_AT}
      >
        {strings('rewards.leaderboard_position.updated_at', {
          time: formatComputedAt(position.computed_at),
        })}
      </Text>
    </Box>
  );
};

export default OndoLeaderboardPosition;
