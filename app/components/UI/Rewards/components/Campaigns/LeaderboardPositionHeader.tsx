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
import {
  StatCell,
  PendingTag,
  IneligibleTag,
} from './OndoCampaignStatsSummary';
import { strings } from '../../../../../../locales/i18n';
import { formatComputedAt } from '../../utils/formatUtils';

export const LEADERBOARD_POSITION_HEADER_TEST_IDS = {
  CONTAINER: 'leaderboard-position-header-container',
  RANK_VALUE: 'leaderboard-position-header-rank',
  RETURN_VALUE: 'leaderboard-position-header-return',
  TIER_VALUE: 'leaderboard-position-header-tier',
  PRIZE_POOL_VALUE: 'leaderboard-position-header-prize-pool',
  COMPUTED_AT: 'leaderboard-position-header-computed-at',
  PENDING_TAG: 'leaderboard-position-header-pending-tag',
  INELIGIBLE_TAG: 'leaderboard-position-header-ineligible-tag',
  QUALIFIED_ICON: 'leaderboard-position-header-qualified-icon',
} as const;

interface LeaderboardPositionHeaderProps {
  rank: string;
  tier: string;
  isLoading?: boolean;
  isPending?: boolean;
  isQualified?: boolean;
  isIneligible?: boolean;
  showReturn?: boolean;
  returnValue?: string;
  returnColor?: TextColor;
  showPrizePool?: boolean;
  prizePoolValue?: string;
  prizePoolLoading?: boolean;
  /** When true, shows formatted `computedAt` (ISO) on the same row as return, right-aligned. */
  showComputedAt?: boolean;
  /** ISO 8601 timestamp; displayed via {@link formatComputedAt}. */
  computedAt?: string | null;
}

const LeaderboardPositionHeader: React.FC<LeaderboardPositionHeaderProps> = ({
  rank,
  tier,
  isLoading = false,
  isPending = false,
  isQualified = false,
  isIneligible = false,
  showReturn = false,
  returnValue,
  returnColor = TextColor.TextDefault,
  showPrizePool = false,
  prizePoolValue,
  prizePoolLoading = false,
}) => {
  const tw = useTailwind();
  const showSubtextRow = showReturn && Boolean(returnValue);

  return (
    <Box
      twClassName="gap-3"
      testID={LEADERBOARD_POSITION_HEADER_TEST_IDS.CONTAINER}
    >
      {/* Your rank heading + large rank value */}
      <Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
        >
          <Text variant={TextVariant.HeadingMd}>
            {strings('rewards.ondo_campaign_stats.label_your_rank')}
          </Text>
          {isIneligible && (
            <IneligibleTag
              testID={LEADERBOARD_POSITION_HEADER_TEST_IDS.INELIGIBLE_TAG}
            />
          )}
          {!isIneligible && isPending && (
            <PendingTag
              testID={LEADERBOARD_POSITION_HEADER_TEST_IDS.PENDING_TAG}
            />
          )}
          {!isIneligible && isQualified && (
            <Icon
              name={IconName.Check}
              size={IconSize.Sm}
              color={IconColor.SuccessDefault}
              testID={LEADERBOARD_POSITION_HEADER_TEST_IDS.QUALIFIED_ICON}
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
              testID={LEADERBOARD_POSITION_HEADER_TEST_IDS.RANK_VALUE}
            >
              {rank}
            </Text>
            {showSubtextRow && (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="mt-1 w-full"
              >
                <Box twClassName="min-w-0 flex-1">
                  {showReturn && returnValue && (
                    <Text
                      variant={TextVariant.BodySm}
                      color={returnColor}
                      fontWeight={FontWeight.Medium}
                      testID={LEADERBOARD_POSITION_HEADER_TEST_IDS.RETURN_VALUE}
                    >
                      {returnValue}
                    </Text>
                  )}
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Tier + optional Prize Pool */}
      <Box flexDirection={BoxFlexDirection.Row}>
        <StatCell
          label={strings('rewards.ondo_campaign_stats.label_tier')}
          value={tier}
          isLoading={isLoading}
          testID={LEADERBOARD_POSITION_HEADER_TEST_IDS.TIER_VALUE}
        />
        {showPrizePool ? (
          <StatCell
            label={strings('rewards.ondo_campaign_prize_pool.title')}
            value={prizePoolValue ?? '-'}
            isLoading={prizePoolLoading}
            testID={LEADERBOARD_POSITION_HEADER_TEST_IDS.PRIZE_POOL_VALUE}
          />
        ) : (
          <Box twClassName="flex-1" />
        )}
      </Box>
    </Box>
  );
};

export default LeaderboardPositionHeader;
