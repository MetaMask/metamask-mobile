import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRankChangeAnimation } from './useRankChangeAnimation';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import TraderAvatar from '../../../Homepage/Sections/TopTraders/components/TraderAvatar';
import {
  RankMedal,
  isTopRank,
} from '../../../Homepage/Sections/TopTraders/topRank';
import type { TraderRowProps } from '../../../Homepage/Sections/TopTraders/types';
/* eslint-enable import-x/no-restricted-paths */
import SocialGradientCardSurface from '../../components/SocialGradientCardSurface';
import { SocialGradientCardSurfaceSelectorsIDs } from '../../components/SocialGradientCardSurface.testIds';
import {
  resolveTraderCohort,
  traderCohortEmoji,
} from '../../SocialV1View/feed/utils/traderStats';
import { formatSignedUsd } from '../../utils/formatters';
import { SocialV1TraderRowSelectorsIDs } from './SocialV1TraderRow.testIds';

const AVATAR_SIZE = 40;
const MEDAL_HEIGHT = 28;
const RANK_COLUMN_WIDTH = 32;
/**
 * Single-line row: rank, avatar, name + badges, PnL. Locked so the skeleton
 * occupies the same vertical space.
 */
export const SOCIAL_V1_TRADER_ROW_HEIGHT = 56;

/**
 * Social V1 leaderboard row: position (medals for 1–3), avatar, username,
 * invented verified badge, cohort emoji, and the ranked metric.
 *
 * Accepts shared `TraderRowProps` so `TopTradersView` can inject it in place
 * of the legacy Follow-button row. Follow and mute callbacks are ignored.
 */
const SocialV1TraderRow: React.FC<TraderRowProps> = ({
  trader,
  metric,
  onTraderPress,
  testID,
  highlighted = false,
  hideRank = false,
}) => {
  const metricText = metric?.label ?? formatSignedUsd(trader.pnlValue);
  const isMetricPositive = metric?.isPositive ?? trader.pnlValue >= 0;
  const showMedal = !hideRank && isTopRank(trader.rank);
  const rankChangeStyle = useRankChangeAnimation(trader.rank);
  const cohortEmoji = traderCohortEmoji(resolveTraderCohort(trader.pnlValue));

  const rowBody = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={3}
      style={{ height: SOCIAL_V1_TRADER_ROW_HEIGHT }}
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        style={{ width: RANK_COLUMN_WIDTH }}
        testID={SocialV1TraderRowSelectorsIDs.RANK}
      >
        {hideRank ? null : showMedal ? (
          <RankMedal rank={trader.rank} size={MEDAL_HEIGHT} />
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextMuted}
          >
            {trader.rank}
          </Text>
        )}
      </Box>

      <TraderAvatar
        imageUrl={trader.avatarUri}
        address={trader.address}
        size={AVATAR_SIZE}
        recyclingKey={trader.id}
      />

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
        twClassName="flex-1 min-w-0"
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
        <Icon
          name={IconName.VerifiedFilled}
          size={IconSize.Sm}
          twClassName="text-info-default shrink-0"
          testID={SocialV1TraderRowSelectorsIDs.VERIFIED_BADGE}
        />
        {cohortEmoji ? (
          <Text
            variant={TextVariant.BodySm}
            twClassName="shrink-0"
            testID={SocialV1TraderRowSelectorsIDs.COHORT}
          >
            {cohortEmoji}
          </Text>
        ) : null}
      </Box>

      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        numberOfLines={1}
        twClassName={
          isMetricPositive
            ? 'text-success-default shrink-0'
            : 'text-error-default shrink-0'
        }
      >
        {metricText}
      </Text>
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
        testID={testID ?? `trader-row-${trader.id}`}
      >
        <Box twClassName="px-4">
          {highlighted ? (
            <SocialGradientCardSurface
              testID={SocialV1TraderRowSelectorsIDs.HIGHLIGHT}
              gradientTestID={SocialGradientCardSurfaceSelectorsIDs.GRADIENT}
            >
              {rowBody}
            </SocialGradientCardSurface>
          ) : (
            rowBody
          )}
        </Box>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default React.memo(SocialV1TraderRow);
