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
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { useGetOndoLeaderboardPosition } from '../../hooks/useGetOndoLeaderboardPosition';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { formatRateOfReturn } from './OndoLeaderboard.utils';
import formatFiat from '../../../../../util/formatFiat';
import { BigNumber } from 'bignumber.js';
import {
  selectRewardsSubscriptionId,
  selectCampaignParticipantOptedIn,
} from '../../../../../selectors/rewards';

export const ONDO_LEADERBOARD_POSITION_TEST_IDS = {
  CONTAINER: 'ondo-leaderboard-position-container',
  RANK: 'ondo-leaderboard-position-rank',
  TIER: 'ondo-leaderboard-position-tier',
  RATE_OF_RETURN: 'ondo-leaderboard-position-rate-of-return',
  TOTAL_DEPOSITED: 'ondo-leaderboard-position-total-deposited',
  CURRENT_VALUE: 'ondo-leaderboard-position-current-value',
  LOADING: 'ondo-leaderboard-position-loading',
  ERROR: 'ondo-leaderboard-position-error',
  NOT_FOUND: 'ondo-leaderboard-position-not-found',
} as const;

interface OndoLeaderboardPositionProps {
  campaignId: string | undefined;
}

const formatUsd = (value: number): string =>
  formatFiat(new BigNumber(value), 'USD');

const PositionSkeleton: React.FC = () => {
  const tw = useTailwind();
  return (
    <Box
      twClassName="gap-3"
      testID={ONDO_LEADERBOARD_POSITION_TEST_IDS.LOADING}
    >
      {/* Row 1: Rank | Tier */}
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-4">
        <Skeleton style={tw.style('h-12 flex-1 rounded-lg')} />
        <Skeleton style={tw.style('h-12 flex-1 rounded-lg')} />
        <Box twClassName="flex-1" />
      </Box>
      {/* Row 2: Total Deposited | Current Value | Return */}
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-4">
        <Skeleton style={tw.style('h-12 flex-1 rounded-lg')} />
        <Skeleton style={tw.style('h-12 flex-1 rounded-lg')} />
        <Skeleton style={tw.style('h-12 flex-1 rounded-lg')} />
      </Box>
    </Box>
  );
};

const CELL_STYLE = { flex: 1 } as const;

interface StatCellProps {
  label: string;
  value: string;
  valueColor?: TextColor;
  testID?: string;
  style?: { flex: number };
}

const StatCell: React.FC<StatCellProps> = ({
  label,
  value,
  valueColor = TextColor.TextDefault,
  testID,
  style,
}) => (
  <Box style={style}>
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
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isOptedIn = useSelector(
    selectCampaignParticipantOptedIn(subscriptionId, campaignId),
  );
  const { position, isLoading, hasError, hasFetched, refetch } =
    useGetOndoLeaderboardPosition(campaignId);

  if (!isOptedIn) {
    return null;
  }

  if (isLoading && !position) {
    return <PositionSkeleton />;
  }

  if (hasError && !position) {
    return (
      <RewardsErrorBanner
        title={strings(
          'rewards.ondo_campaign_leaderboard_position.error_loading',
        )}
        description={strings(
          'rewards.ondo_campaign_leaderboard_position.error_loading_description',
        )}
        onConfirm={refetch}
        confirmButtonLabel={strings(
          'rewards.ondo_campaign_leaderboard_position.retry',
        )}
        testID={ONDO_LEADERBOARD_POSITION_TEST_IDS.ERROR}
      />
    );
  }

  if (!position) {
    if (hasFetched) {
      return (
        <Box testID={ONDO_LEADERBOARD_POSITION_TEST_IDS.NOT_FOUND}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('rewards.ondo_campaign_leaderboard_position.not_found')}
          </Text>
        </Box>
      );
    }
    return null;
  }

  const rorColor =
    position.rateOfReturn >= 0
      ? TextColor.SuccessDefault
      : TextColor.ErrorDefault;

  return (
    <Box
      twClassName="gap-3"
      testID={ONDO_LEADERBOARD_POSITION_TEST_IDS.CONTAINER}
    >
      <Text variant={TextVariant.HeadingMd}>
        {strings('rewards.ondo_campaign_leaderboard_position.title')}
      </Text>

      {/* Grid row 1: Rank | Tier | (empty) */}
      <Box flexDirection={BoxFlexDirection.Row}>
        <StatCell
          label={strings('rewards.ondo_campaign_leaderboard_position.rank')}
          value={`#${position.rank}`}
          style={CELL_STYLE}
          testID={ONDO_LEADERBOARD_POSITION_TEST_IDS.RANK}
        />
        <StatCell
          label={strings('rewards.ondo_campaign_leaderboard_position.tier')}
          value={position.projectedTier}
          style={CELL_STYLE}
          testID={ONDO_LEADERBOARD_POSITION_TEST_IDS.TIER}
        />
        <Box style={CELL_STYLE} />
      </Box>

      {/* Grid row 2: Total Deposited | Current Value | Return */}
      <Box flexDirection={BoxFlexDirection.Row}>
        <StatCell
          label={strings(
            'rewards.ondo_campaign_leaderboard_position.total_deposited',
          )}
          value={formatUsd(position.totalUsdDeposited)}
          style={CELL_STYLE}
          testID={ONDO_LEADERBOARD_POSITION_TEST_IDS.TOTAL_DEPOSITED}
        />
        <StatCell
          label={strings(
            'rewards.ondo_campaign_leaderboard_position.current_value',
          )}
          value={formatUsd(position.currentUsdValue)}
          style={CELL_STYLE}
          testID={ONDO_LEADERBOARD_POSITION_TEST_IDS.CURRENT_VALUE}
        />
        <StatCell
          label={strings(
            'rewards.ondo_campaign_leaderboard_position.rate_of_return',
          )}
          value={formatRateOfReturn(position.rateOfReturn)}
          valueColor={rorColor}
          style={CELL_STYLE}
          testID={ONDO_LEADERBOARD_POSITION_TEST_IDS.RATE_OF_RETURN}
        />
      </Box>
    </Box>
  );
};

export default OndoLeaderboardPosition;
