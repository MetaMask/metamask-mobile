import React from 'react';
import { TextColor } from '@metamask/design-system-react-native';
import type { PerpsTradingCampaignLeaderboardPositionDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import {
  formatRewardsTimeOnly,
  formatSignedUsd,
} from '../../utils/formatUtils';
import CampaignLeaderboardStatsHeader from './CampaignLeaderboardStatsHeader';

export const PERPS_STATS_HEADER_TEST_IDS = {
  CONTAINER: 'perps-stats-header-container',
  RANK_VALUE: 'perps-stats-header-rank',
  SUBTEXT_VALUE: 'perps-stats-header-pnl',
  PNL_VALUE: 'perps-stats-header-pnl',
  COMPUTED_AT: 'perps-stats-header-computed-at',
  PENDING_TAG: 'perps-stats-header-pending-tag',
  QUALIFIED_ICON: 'perps-stats-header-qualified-icon',
} as const;

interface PerpsTradingCampaignStatsHeaderProps {
  position: PerpsTradingCampaignLeaderboardPositionDto | null;
  isLoading?: boolean;
  /** When true, shows PnL under the rank in BodySm (same pattern as return in LeaderboardPositionHeader). */
  showPnl?: boolean;
  /** When true, shows formatted `computedAt` time on the same row as PnL, right-aligned in alternative text color. */
  showComputedAt?: boolean;
  /** When true, suppresses the "Pending" tag — qualification is locked once the campaign ends. */
  isCampaignComplete?: boolean;
}

const PerpsTradingCampaignStatsHeader: React.FC<
  PerpsTradingCampaignStatsHeaderProps
> = ({
  position,
  isLoading = false,
  showPnl = true,
  showComputedAt = true,
  isCampaignComplete = false,
}) => {
  const rank =
    position != null && Number.isFinite(position.rank) ? position.rank : null;
  const pnl =
    position != null && Number.isFinite(position.pnl) ? position.pnl : null;

  const pnlValue = pnl != null ? formatSignedUsd(pnl) : '—';
  const pnlColor =
    pnl != null
      ? pnl >= 0
        ? TextColor.SuccessDefault
        : TextColor.ErrorDefault
      : TextColor.TextDefault;

  const computedAtLabel = position?.computedAt
    ? strings('rewards.perps_trading_campaign.last_updated', {
        time: formatRewardsTimeOnly(new Date(position.computedAt)),
      })
    : '';

  return (
    <CampaignLeaderboardStatsHeader
      title={strings('rewards.perps_trading_campaign.label_your_rank')}
      rank={rank}
      isEligible={position?.eligible ?? null}
      isLoading={isLoading}
      subtextValue={pnlValue}
      subtextColor={pnlColor}
      computedAtLabel={computedAtLabel}
      showSubtext={showPnl}
      showComputedAt={showComputedAt}
      isCampaignComplete={isCampaignComplete}
      testIDs={PERPS_STATS_HEADER_TEST_IDS}
    />
  );
};

export default PerpsTradingCampaignStatsHeader;
