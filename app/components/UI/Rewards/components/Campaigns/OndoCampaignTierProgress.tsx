import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import formatFiat from '../../../../../util/formatFiat';
import { BigNumber } from 'bignumber.js';
import {
  selectRewardsSubscriptionId,
  selectCampaignParticipantOptedIn,
} from '../../../../../selectors/rewards';
import {
  selectCampaigns,
  selectOndoCampaignPortfolioById,
} from '../../../../../reducers/rewards/selectors';
import {
  formatTierProgressPercent,
  getOndoTierProgressState,
  parseOndoPortfolioNetDepositUsd,
  type OndoTierProgressState,
} from './OndoTierProgress.util';

export const ONDO_TIER_PROGRESS_TEST_IDS = {
  CONTAINER: 'ondo-tier-progress',
  NET_DEPOSIT: 'ondo-tier-progress-net-deposit',
  BAR: 'ondo-tier-progress-bar',
  FILL: 'ondo-tier-progress-fill',
  PERCENT: 'ondo-tier-progress-percent',
  HELPER: 'ondo-tier-progress-helper',
} as const;

const formatUsd = (value: number): string =>
  formatFiat(new BigNumber(value), 'USD');

interface TierProgressBarProps {
  tierState: OndoTierProgressState;
  netDepositUsd: number;
}

/**
 * Tier ladder progress toward the next `minNetDeposit` threshold (segment bar,
 * percent label, and helper copy).
 */
const TierProgressBar: React.FC<TierProgressBarProps> = ({
  tierState,
  netDepositUsd,
}) => {
  const progressRatio = tierState.kind === 'top' ? 1 : tierState.progressRatio;
  const percentLabel = formatTierProgressPercent(progressRatio);

  const helperText =
    tierState.kind === 'top'
      ? strings(
          'rewards.ondo_campaign_leaderboard_position.tier_progress_top_tier',
        )
      : strings(
          'rewards.ondo_campaign_leaderboard_position.tier_progress_deposit_more',
          { amount: formatUsd(tierState.remainingUsd) },
        );

  const fillWidthPercent =
    tierState.kind === 'top' ? 100 : Math.round(tierState.progressRatio * 100);

  return (
    <Box twClassName="gap-2" testID={ONDO_TIER_PROGRESS_TEST_IDS.CONTAINER}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          testID={ONDO_TIER_PROGRESS_TEST_IDS.NET_DEPOSIT}
        >
          {formatUsd(netDepositUsd)}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          testID={ONDO_TIER_PROGRESS_TEST_IDS.PERCENT}
        >
          {percentLabel}
        </Text>
      </Box>
      <Box
        twClassName="h-2 w-full overflow-hidden rounded-full bg-muted"
        testID={ONDO_TIER_PROGRESS_TEST_IDS.BAR}
      >
        <Box
          twClassName="h-full rounded-full bg-success-default"
          style={{ width: `${fillWidthPercent}%` }}
          testID={ONDO_TIER_PROGRESS_TEST_IDS.FILL}
        />
      </Box>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        testID={ONDO_TIER_PROGRESS_TEST_IDS.HELPER}
      >
        {helperText}
      </Text>
    </Box>
  );
};

export interface OndoCampaignTierProgressProps {
  campaignId: string | undefined;
}

/**
 * Campaign tier progress: reads `summary.netDeposit` from the portfolio in Redux
 * (populated by `useGetOndoPortfolioPosition` elsewhere) and renders the tier bar.
 */
const OndoCampaignTierProgress: React.FC<OndoCampaignTierProgressProps> = ({
  campaignId,
}) => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const campaigns = useSelector(selectCampaigns);
  const isOptedIn = useSelector(
    selectCampaignParticipantOptedIn(subscriptionId, campaignId),
  );
  const portfolio = useSelector(
    selectOndoCampaignPortfolioById(subscriptionId ?? undefined, campaignId),
  );

  const tiers = useMemo(
    () => campaigns.find((c) => c.id === campaignId)?.details?.tiers ?? [],
    [campaigns, campaignId],
  );

  const netDepositUsd = useMemo(
    () => parseOndoPortfolioNetDepositUsd(portfolio?.summary?.netDeposit),
    [portfolio?.summary?.netDeposit],
  );

  const tierProgressState = useMemo(() => {
    if (tiers.length === 0 || netDepositUsd === null) {
      return null;
    }
    return getOndoTierProgressState(tiers, netDepositUsd);
  }, [tiers, netDepositUsd]);

  if (!isOptedIn) {
    return null;
  }

  if (tierProgressState === null || netDepositUsd === null) {
    return null;
  }

  return (
    <>
      <Box twClassName="border-b border-border-muted" />
      <Box twClassName="px-4 py-4">
        <TierProgressBar
          tierState={tierProgressState}
          netDepositUsd={netDepositUsd}
        />
      </Box>
    </>
  );
};

export default OndoCampaignTierProgress;
