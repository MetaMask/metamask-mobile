import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRankChangeAnimation } from './useRankChangeAnimation';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import TraderAvatar from '../../../../UI/SocialFeed/components/TraderAvatar';
import {
  RankMedal,
  isTopRank,
} from '../../../Homepage/Sections/TopTraders/topRank';
import { getTraderRowTestId } from '../../../Homepage/Sections/TopTraders/components/TraderRow.testIds';
import type {
  TraderRowMetric,
  TraderRowProps,
} from '../../../Homepage/Sections/TopTraders/types';
/* eslint-enable import-x/no-restricted-paths */
import {
  formatFollowerCountLabel,
  formatPercent,
  formatSignedUsd,
} from '../../../../UI/SocialFeed/utils/formatters';
import { SocialV1TraderRowSelectorsIDs } from './SocialV1TraderRow.testIds';

const AVATAR_SIZE = 40;
const MEDAL_SIZE = 24;
const RANK_COLUMN_WIDTH = 32;
/**
 * Single-line row: rank, avatar, name + badges, PnL. Locked so the skeleton
 * occupies the same vertical space. Perps home and any caller that does not
 * opt into leaderboard details keep this height.
 */
export const SOCIAL_V1_TRADER_ROW_HEIGHT = 56;

/**
 * Leaderboard row with a follower line under the name and a percent under the
 * dollar. Taller so both lines sit beside the avatar.
 */
export const SOCIAL_V1_TRADER_ROW_DETAIL_HEIGHT = 72;

/** Reserves the second line so the dollar and username stay aligned. */
const DETAIL_SUBLINE_MIN_HEIGHT = 18;

export interface SocialV1TraderRowProps extends TraderRowProps {
  /**
   * Social V1 leaderboard only. Shows the windowed ROI under the dollar and
   * the follower count under the username.
   */
  showLeaderboardDetails?: boolean;
  /**
   * Hides the ROI line on the pinned card when the profile has no ROI.
   * A real 0% still shows.
   */
  omitPercentage?: boolean;
  /**
   * Shown under the metric in place of the ROI line, when leaderboard details
   * are on. A holder row puts its P&L here, under the position size.
   */
  secondaryMetric?: TraderRowMetric;
  /**
   * Drops the rank column, medals included, so the avatar leads the row.
   * Unlike `hideRank`, the column's width is not kept.
   */
  showRankColumn?: boolean;
  /** Tag after the username, green when `isPositive` and red otherwise. */
  nameTag?: TraderRowMetric;
}

const metricColorClass = (metric: TraderRowMetric): string => {
  if (metric.isNeutral) return 'text-default';
  return metric.isPositive ? 'text-success-default' : 'text-error-default';
};

/**
 * Social V1 leaderboard row: position (medals for 1–3), avatar, username,
 * and the ranked metric.
 *
 * Accepts shared `TraderRowProps` so `TopTradersView` can inject it in place
 * of the legacy Follow-button row. Follow and mute callbacks are ignored.
 */
const SocialV1TraderRow: React.FC<SocialV1TraderRowProps> = ({
  trader,
  metric,
  onTraderPress,
  testID,
  highlighted = false,
  hideRank = false,
  showLeaderboardDetails = false,
  omitPercentage = false,
  secondaryMetric,
  showRankColumn = true,
  nameTag,
}) => {
  const resolvedMetric: TraderRowMetric = metric ?? {
    label: formatSignedUsd(trader.pnlValue),
    isPositive: trader.pnlValue >= 0,
  };
  const showMedal = !hideRank && isTopRank(trader.rank);
  const rowHeight = showLeaderboardDetails
    ? SOCIAL_V1_TRADER_ROW_DETAIL_HEIGHT
    : SOCIAL_V1_TRADER_ROW_HEIGHT;
  // A missing ROI on a list row is stored as 0. Hide that line rather than
  // showing +0.0%. The pinned viewer card shows zero details explicitly.
  const showZeroDetails = highlighted;
  const percentMetric: TraderRowMetric | null =
    showLeaderboardDetails &&
    !omitPercentage &&
    (trader.percentageChange !== 0 || showZeroDetails)
      ? {
          label: formatPercent(trader.percentageChange, { decimals: 1 }),
          isPositive: trader.percentageChange >= 0,
        }
      : null;
  const subMetric = showLeaderboardDetails
    ? (secondaryMetric ?? percentMetric)
    : null;
  const followerLabel =
    showLeaderboardDetails && (trader.followerCount > 0 || showZeroDetails)
      ? formatFollowerCountLabel(trader.followerCount)
      : null;
  const rankChangeStyle = useRankChangeAnimation(trader.rank);
  const rowBody = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={3}
      style={highlighted ? undefined : { height: rowHeight }}
    >
      {showRankColumn ? (
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          style={{ width: RANK_COLUMN_WIDTH }}
          testID={SocialV1TraderRowSelectorsIDs.RANK}
        >
          {hideRank ? null : showMedal ? (
            <RankMedal rank={trader.rank} size={MEDAL_SIZE} />
          ) : (
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={
                highlighted ? TextColor.TextAlternative : TextColor.TextMuted
              }
            >
              {trader.rank}
            </Text>
          )}
        </Box>
      ) : null}

      <TraderAvatar
        imageUrl={trader.avatarUri}
        address={trader.address}
        profileId={trader.id}
        size={AVATAR_SIZE}
        recyclingKey={trader.id}
      />

      <Box twClassName="flex-1 min-w-0">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={1}
            twClassName="shrink"
          >
            {trader.username}
          </Text>
          {nameTag ? (
            <Tag
              severity={
                nameTag.isPositive ? TagSeverity.Success : TagSeverity.Danger
              }
              twClassName="shrink-0"
              testID={SocialV1TraderRowSelectorsIDs.NAME_TAG}
            >
              {nameTag.label}
            </Tag>
          ) : null}
        </Box>
        {showLeaderboardDetails ? (
          <Box style={{ minHeight: DETAIL_SUBLINE_MIN_HEIGHT }}>
            {followerLabel ? (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                numberOfLines={1}
                testID={SocialV1TraderRowSelectorsIDs.FOLLOWERS}
              >
                {followerLabel}
              </Text>
            ) : null}
          </Box>
        ) : null}
      </Box>

      <Box alignItems={BoxAlignItems.End} twClassName="shrink-0">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          numberOfLines={1}
          twClassName={`${metricColorClass(resolvedMetric)} shrink-0`}
          testID={SocialV1TraderRowSelectorsIDs.METRIC}
        >
          {resolvedMetric.label}
        </Text>
        {showLeaderboardDetails ? (
          <Box
            alignItems={BoxAlignItems.End}
            style={{ minHeight: DETAIL_SUBLINE_MIN_HEIGHT }}
          >
            {subMetric?.label ? (
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                numberOfLines={1}
                twClassName={metricColorClass(subMetric)}
                testID={SocialV1TraderRowSelectorsIDs.PERCENTAGE}
              >
                {subMetric.label}
              </Text>
            ) : null}
          </Box>
        ) : null}
      </Box>
    </Box>
  );

  return (
    <Animated.View style={rankChangeStyle}>
      <TouchableOpacity
        activeOpacity={onTraderPress ? 0.7 : 1}
        onPress={
          onTraderPress
            ? () =>
                onTraderPress(trader.id, trader.username, trader.overallRank)
            : undefined
        }
        disabled={!onTraderPress}
        testID={testID ?? getTraderRowTestId(trader.id)}
      >
        <Box twClassName={highlighted ? 'px-2 py-1' : 'px-4'}>
          {highlighted ? (
            <Box
              testID={SocialV1TraderRowSelectorsIDs.HIGHLIGHT}
              twClassName="rounded-2xl border border-muted bg-muted px-2 py-3"
            >
              {rowBody}
            </Box>
          ) : (
            rowBody
          )}
        </Box>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default React.memo(SocialV1TraderRow);
