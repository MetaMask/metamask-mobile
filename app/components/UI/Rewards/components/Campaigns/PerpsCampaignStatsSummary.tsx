import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type {
  CampaignParticipantOutcomeStatus,
  PerpsTradingCampaignLeaderboardDto,
  PerpsTradingCampaignLeaderboardPositionDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import { formatSignedUsd, formatUsd } from '../../utils/formatUtils';
import { PERPS_QUALIFICATION_NOTIONAL_USD } from '../../utils/perpsCampaignConstants';
import { PendingTag, StatCell } from './OndoCampaignStatsSummary';
import { CampaignOutcomeBanner } from './CampaignOutcomeBanners';

export const PERPS_CAMPAIGN_STATS_SUMMARY_TEST_IDS = {
  CONTAINER: 'perps-campaign-stats-summary-container',
  RANK: 'perps-campaign-stats-summary-rank',
  PNL: 'perps-campaign-stats-summary-pnl',
  NOTIONAL_VOLUME: 'perps-campaign-stats-summary-notional-volume',
  PENDING_TAG: 'perps-campaign-stats-summary-pending-tag',
  QUALIFIED_TAG: 'perps-campaign-stats-summary-qualified-tag',
  QUALIFIED_CARD: 'perps-campaign-stats-summary-qualified-card',
  QUALIFY_FOR_RANK_CARD: 'perps-campaign-stats-summary-qualify-for-rank-card',
} as const;

export interface PerpsCampaignStatsSummaryProps {
  leaderboardPosition: PerpsTradingCampaignLeaderboardPositionDto | null;
  /** Passed for future use (e.g. leaderboard-level metadata); stats values come from `leaderboardPosition`. */
  leaderboard: PerpsTradingCampaignLeaderboardDto | null;
  /** When false, pending (not yet qualified) users see a {@link PendingTag} next to rank. */
  isCampaignComplete?: boolean;
  outcomeStatus?: CampaignParticipantOutcomeStatus;
  winnerVerificationCode?: string | null;
  onWinnerPress?: () => void;
}

const PerpsCampaignStatsSummary: React.FC<PerpsCampaignStatsSummaryProps> = ({
  leaderboardPosition,
  leaderboard: _leaderboard,
  isCampaignComplete = false,
  outcomeStatus,
  winnerVerificationCode,
  onWinnerPress,
}) => {
  const isPending =
    leaderboardPosition != null && !leaderboardPosition.eligible;
  const isQualified =
    leaderboardPosition != null && leaderboardPosition.eligible;
  const rank =
    leaderboardPosition != null && Number.isFinite(leaderboardPosition.rank)
      ? leaderboardPosition.rank
      : null;
  const pnl =
    leaderboardPosition != null && Number.isFinite(leaderboardPosition.pnl)
      ? leaderboardPosition.pnl
      : null;
  const volume =
    leaderboardPosition != null && Number.isFinite(leaderboardPosition.volume)
      ? leaderboardPosition.volume
      : null;

  const rankDisplay = rank != null ? String(rank).padStart(2, '0') : '—';

  const pnlDisplay = pnl != null ? formatSignedUsd(pnl) : '—';

  const pnlColor =
    pnl != null
      ? pnl >= 0
        ? TextColor.SuccessDefault
        : TextColor.ErrorDefault
      : TextColor.TextDefault;

  const volumeDisplay = volume != null ? formatUsd(volume) : '—';

  const minVolumeForEligibility =
    leaderboardPosition?.minVolumeForEligibility ??
    PERPS_QUALIFICATION_NOTIONAL_USD;

  const volumeGap =
    volume != null ? Math.max(0, minVolumeForEligibility - volume) : 0;

  const showQualifiedCard =
    !isCampaignComplete && isQualified && leaderboardPosition != null;

  const showQualifyForRankCard =
    !isCampaignComplete &&
    isPending &&
    leaderboardPosition != null &&
    volumeGap > 0;

  return (
    <Box
      twClassName="gap-3"
      testID={PERPS_CAMPAIGN_STATS_SUMMARY_TEST_IDS.CONTAINER}
    >
      <Box flexDirection={BoxFlexDirection.Row}>
        <StatCell
          label={strings('rewards.perps_trading_campaign.label_rank')}
          value={rankDisplay}
          testID={PERPS_CAMPAIGN_STATS_SUMMARY_TEST_IDS.RANK}
          suffix={
            !isCampaignComplete && isPending ? (
              <PendingTag
                testID={PERPS_CAMPAIGN_STATS_SUMMARY_TEST_IDS.PENDING_TAG}
              />
            ) : isQualified ? (
              <Icon
                name={IconName.Check}
                size={IconSize.Sm}
                color={IconColor.SuccessDefault}
                testID={PERPS_CAMPAIGN_STATS_SUMMARY_TEST_IDS.QUALIFIED_TAG}
              />
            ) : undefined
          }
        />
        <StatCell
          label={strings('rewards.perps_trading_campaign.label_pnl')}
          value={pnlDisplay}
          valueColor={pnlColor}
          testID={PERPS_CAMPAIGN_STATS_SUMMARY_TEST_IDS.PNL}
        />
      </Box>
      {!isCampaignComplete && (
        <Box flexDirection={BoxFlexDirection.Row}>
          <StatCell
            label={strings('rewards.perps_trading_campaign.label_volume')}
            value={volumeDisplay}
            testID={PERPS_CAMPAIGN_STATS_SUMMARY_TEST_IDS.NOTIONAL_VOLUME}
          />
          <Box twClassName="flex-1" />
        </Box>
      )}

      {showQualifiedCard && (
        <Box
          twClassName="bg-muted rounded-xl p-4 mt-2 gap-2"
          testID={PERPS_CAMPAIGN_STATS_SUMMARY_TEST_IDS.QUALIFIED_CARD}
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('rewards.perps_trading_campaign.stats_qualified_title')}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings(
              'rewards.perps_trading_campaign.stats_qualified_description',
            )}
          </Text>
        </Box>
      )}

      {showQualifyForRankCard && (
        <Box
          twClassName="bg-muted rounded-xl p-4 mt-2 gap-2"
          testID={PERPS_CAMPAIGN_STATS_SUMMARY_TEST_IDS.QUALIFY_FOR_RANK_CARD}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2"
          >
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings(
                'rewards.perps_trading_campaign.stats_qualify_for_rank_title',
              )}
            </Text>
          </Box>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings(
              'rewards.perps_trading_campaign.stats_qualify_for_rank_description',
              {
                notionalRemaining: formatUsd(volumeGap),
              },
            )}
          </Text>
        </Box>
      )}

      {isCampaignComplete && outcomeStatus != null && onWinnerPress != null && (
        <CampaignOutcomeBanner
          outcomeStatus={outcomeStatus}
          winnerVerificationCode={winnerVerificationCode ?? null}
          onWinnerPress={onWinnerPress}
        />
      )}
    </Box>
  );
};

export default PerpsCampaignStatsSummary;
