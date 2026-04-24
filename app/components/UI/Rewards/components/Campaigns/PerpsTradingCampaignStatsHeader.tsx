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
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { PendingTag } from './OndoCampaignStatsSummary';
import type { PerpsTradingCampaignLeaderboardPositionDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import { formatComputedAt, formatSignedUsd } from '../../utils/formatUtils';

export const PERPS_STATS_HEADER_TEST_IDS = {
  CONTAINER: 'perps-stats-header-container',
  RANK_VALUE: 'perps-stats-header-rank',
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
}

const PerpsTradingCampaignStatsHeader: React.FC<
  PerpsTradingCampaignStatsHeaderProps
> = ({
  position,
  isLoading = false,
  showPnl = true,
  showComputedAt = true,
}) => {
  const tw = useTailwind();

  const isPending = position != null && !position.qualified;
  const isQualified = position != null && position.qualified;

  const rankValue = position ? String(position.rank).padStart(2, '0') : '—';
  const pnlValue = position ? formatSignedUsd(position.pnl) : '—';
  const pnlColor = position
    ? position.pnl >= 0
      ? TextColor.SuccessDefault
      : TextColor.ErrorDefault
    : TextColor.TextDefault;

  const computedAtLabel =
    position != null ? formatComputedAt(position.computedAt) : '';

  const showSubtextRow = showPnl || showComputedAt;

  return (
    <Box twClassName="gap-4" testID={PERPS_STATS_HEADER_TEST_IDS.CONTAINER}>
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
          <>
            <Skeleton style={tw.style('h-9 w-28 rounded')} />
            {showSubtextRow && (
              <Skeleton style={tw.style('mt-1 h-4 w-full max-w-xs rounded')} />
            )}
          </>
        ) : (
          <>
            <Text
              variant={TextVariant.DisplayLg}
              fontWeight={FontWeight.Bold}
              testID={PERPS_STATS_HEADER_TEST_IDS.RANK_VALUE}
            >
              {rankValue}
            </Text>
            {showSubtextRow && (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="w-full"
              >
                <Box twClassName="min-w-0 flex-1">
                  {showPnl && (
                    <Text
                      variant={TextVariant.BodySm}
                      color={pnlColor}
                      fontWeight={FontWeight.Medium}
                      testID={PERPS_STATS_HEADER_TEST_IDS.PNL_VALUE}
                    >
                      {pnlValue}
                    </Text>
                  )}
                </Box>
                {showComputedAt && computedAtLabel.length > 0 && (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    fontWeight={FontWeight.Medium}
                    testID={PERPS_STATS_HEADER_TEST_IDS.COMPUTED_AT}
                  >
                    {computedAtLabel}
                  </Text>
                )}
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default PerpsTradingCampaignStatsHeader;
