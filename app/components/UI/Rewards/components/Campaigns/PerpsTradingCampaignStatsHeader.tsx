import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { StatCell, PendingTag } from './CampaignStatsSummary';
import type { PerpsTradingCampaignLeaderboardPositionDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import { formatPnl } from './PerpsTradingCampaignLeaderboard.utils';
import { formatUsd } from '../../utils/formatUtils';

export const PERPS_STATS_HEADER_TEST_IDS = {
  CONTAINER: 'perps-stats-header-container',
  RANK_VALUE: 'perps-stats-header-rank',
  PNL_VALUE: 'perps-stats-header-pnl',
  NOTIONAL_VOLUME: 'perps-stats-header-notional-volume',
  MARGIN_DEPLOYED: 'perps-stats-header-margin-deployed',
  PENDING_TAG: 'perps-stats-header-pending-tag',
  QUALIFIED_ICON: 'perps-stats-header-qualified-icon',
} as const;

const NOTIONAL_VOLUME_THRESHOLD = 25_000;
const MARGIN_THRESHOLD = 1_000;

interface ThresholdRowProps {
  label: string;
  current: number;
  threshold: number;
  testID?: string;
}

const ThresholdRow: React.FC<ThresholdRowProps> = ({
  label,
  current,
  threshold,
  testID,
}) => {
  const progress = Math.min(current / threshold, 1);
  const progressPercent = `${Math.round(progress * 100)}%`;
  const isMet = current >= threshold;

  return (
    <Box twClassName="gap-1" testID={testID}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        alignItems={BoxAlignItems.Center}
      >
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          fontWeight={FontWeight.Medium}
        >
          {label}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={isMet ? TextColor.SuccessDefault : TextColor.TextDefault}
          fontWeight={FontWeight.Medium}
        >
          {formatUsd(current)} / {formatUsd(threshold)}
        </Text>
      </Box>
      <Box twClassName="h-2 rounded-full bg-muted overflow-hidden">
        <Box
          twClassName={`h-full rounded-full ${isMet ? 'bg-success-default' : 'bg-primary-default'}`}
          style={{ width: progressPercent }}
        />
      </Box>
    </Box>
  );
};

interface PerpsTradingCampaignStatsHeaderProps {
  position: PerpsTradingCampaignLeaderboardPositionDto | null;
  isLoading?: boolean;
}

const PerpsTradingCampaignStatsHeader: React.FC<
  PerpsTradingCampaignStatsHeaderProps
> = ({ position, isLoading = false }) => {
  const tw = useTailwind();

  const isPending = position != null && !position.qualified;
  const isQualified = position != null && position.qualified;

  const rankValue = position ? String(position.rank).padStart(2, '0') : '—';
  const pnlValue = position ? formatPnl(position.pnl) : '—';
  const pnlColor = position
    ? position.pnl >= 0
      ? TextColor.SuccessDefault
      : TextColor.ErrorDefault
    : TextColor.TextDefault;

  return (
    <Box twClassName="gap-4" testID={PERPS_STATS_HEADER_TEST_IDS.CONTAINER}>
      {/* Rank + status badge */}
      <Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
        >
          <Text variant={TextVariant.HeadingMd}>
            {strings('rewards.perps_trading_campaign.label_your_rank')}
          </Text>
          {isPending && (
            <PendingTag testID={PERPS_STATS_HEADER_TEST_IDS.PENDING_TAG} />
          )}
          {isQualified && (
            <Icon
              name={IconName.Check}
              size={IconSize.Sm}
              color={IconColor.SuccessDefault}
              testID={PERPS_STATS_HEADER_TEST_IDS.QUALIFIED_ICON}
            />
          )}
        </Box>

        {isLoading ? (
          <Skeleton style={tw.style('h-9 w-28 rounded')} />
        ) : (
          <Text
            variant={TextVariant.DisplayLg}
            fontWeight={FontWeight.Bold}
            testID={PERPS_STATS_HEADER_TEST_IDS.RANK_VALUE}
          >
            {rankValue}
          </Text>
        )}
      </Box>

      {/* PnL stat */}
      <Box flexDirection={BoxFlexDirection.Row}>
        <StatCell
          label={strings('rewards.perps_trading_campaign.label_pnl')}
          value={pnlValue}
          isLoading={isLoading}
          valueColor={pnlColor}
          testID={PERPS_STATS_HEADER_TEST_IDS.PNL_VALUE}
        />
        <Box twClassName="flex-1" />
      </Box>

      {/* Threshold progress bars */}
      {(isLoading || position) && (
        <Box twClassName="gap-3">
          {isLoading ? (
            <>
              <Skeleton style={tw.style('h-10 rounded')} />
              <Skeleton style={tw.style('h-10 rounded')} />
            </>
          ) : (
            <>
              <ThresholdRow
                label={strings(
                  'rewards.perps_trading_campaign.label_notional_volume',
                )}
                current={position?.notionalVolume ?? 0}
                threshold={NOTIONAL_VOLUME_THRESHOLD}
                testID={PERPS_STATS_HEADER_TEST_IDS.NOTIONAL_VOLUME}
              />
              <ThresholdRow
                label={strings(
                  'rewards.perps_trading_campaign.label_margin_deployed',
                )}
                current={position?.marginDeployed ?? 0}
                threshold={MARGIN_THRESHOLD}
                testID={PERPS_STATS_HEADER_TEST_IDS.MARGIN_DEPLOYED}
              />
            </>
          )}
        </Box>
      )}
    </Box>
  );
};

export default PerpsTradingCampaignStatsHeader;
