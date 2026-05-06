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

const PERPS_NOTIONAL_THRESHOLD_LABEL = formatUsd(
  PERPS_QUALIFICATION_NOTIONAL_USD,
);

export const PERPS_CAMPAIGN_STATS_SUMMARY_TEST_IDS = {
  CONTAINER: 'perps-campaign-stats-summary-container',
  RANK: 'perps-campaign-stats-summary-rank',
  PNL: 'perps-campaign-stats-summary-pnl',
  NOTIONAL_VOLUME: 'perps-campaign-stats-summary-notional-volume',
  MARGIN_DEPLOYED: 'perps-campaign-stats-summary-margin-deployed',
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
    leaderboardPosition != null && !leaderboardPosition.qualified;
  const isQualified =
    leaderboardPosition != null && leaderboardPosition.qualified;

  const rankDisplay = leaderboardPosition
    ? String(leaderboardPosition.rank).padStart(2, '0')
    : '—';

  const pnlDisplay = leaderboardPosition
    ? formatSignedUsd(leaderboardPosition.pnl)
    : '—';

  const pnlColor = leaderboardPosition
    ? leaderboardPosition.pnl >= 0
      ? TextColor.SuccessDefault
      : TextColor.ErrorDefault
    : TextColor.TextDefault;

  const volumeDisplay = leaderboardPosition
    ? formatUsd(leaderboardPosition.notionalVolume)
    : '—';

  const marginDisplay = leaderboardPosition
    ? formatUsd(leaderboardPosition.marginDeployed)
    : '—';

  const notionalGap = leaderboardPosition
    ? Math.max(
        0,
        PERPS_QUALIFICATION_NOTIONAL_USD - leaderboardPosition.notionalVolume,
      )
    : 0;

  const showQualifiedCard =
    !isCampaignComplete && isQualified && leaderboardPosition != null;

  const showQualifyForRankCard =
    !isCampaignComplete &&
    isPending &&
    leaderboardPosition != null &&
    notionalGap > 0;

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
          <StatCell
            label={strings('rewards.perps_trading_campaign.label_margin')}
            value={marginDisplay}
            testID={PERPS_CAMPAIGN_STATS_SUMMARY_TEST_IDS.MARGIN_DEPLOYED}
          />
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
                notionalRemaining: formatUsd(notionalGap),
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
