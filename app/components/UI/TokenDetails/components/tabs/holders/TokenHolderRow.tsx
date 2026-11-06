import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { Pressable } from 'react-native';
import TraderAvatar from '../../../../SocialFeed/components/TraderAvatar';
import type { TraderFeedRow } from '../../../../SocialFeed/types';
import {
  formatAbbreviatedUsd,
  formatFollowerCountLabel,
  formatPercent,
} from '../../../../SocialFeed/utils/formatters';
import { TokenDetailsIds } from '../../../testIds';

/** Matches the avatar size on the Social V1 feed's identity row. */
const AVATAR_SIZE = 32;

export interface TokenHolderRowProps {
  row: TraderFeedRow;
  /** Makes the whole row pressable. Unset leaves the row inert. */
  onPress?: () => void;
}

/**
 * One holder of the token on screen: who they are, and what they hold.
 *
 * The right-hand column is value over percent. The position value is a
 * holding, not a result, so it carries no `+`/`-` and no color -- only the
 * unrealized P&L percent beneath it is colored. The agreed design drops the
 * rank medal, win-rate tag and follow button the old leaderboard row had.
 */
const TokenHolderRow: React.FC<TokenHolderRowProps> = ({ row, onPress }) => {
  const { item, core } = row;
  // Left in USD for now, as the API prices it. Converting to the viewer's
  // currency is a deliberate follow-up, not an oversight.
  // `mapFeedItem` already formats an open position's value as unsigned USD;
  // abbreviate it so a whale's holding keeps the column one line.
  const valueLabel = item.hasValueData
    ? formatAbbreviatedUsd(core.currentValueUSD)
    : '';
  const pnlLabel = item.hasPnlData ? formatPercent(core.pnlPercent) : '';

  const content = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={3}
      twClassName="px-4 py-2"
      testID={TokenDetailsIds.holderRow.CONTAINER}
    >
      <TraderAvatar
        imageUrl={item.avatarUri}
        address={item.traderAddress}
        size={AVATAR_SIZE}
        recyclingKey={item.id}
      />
      <Box twClassName="flex-1 min-w-0">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={1}
          testID={TokenDetailsIds.holderRow.NAME}
        >
          {item.username}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
          testID={TokenDetailsIds.holderRow.FOLLOWERS}
        >
          {formatFollowerCountLabel(core.actor.followerCount)}
        </Text>
      </Box>
      <Box alignItems={BoxAlignItems.End} twClassName="shrink-0">
        {valueLabel ? (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            testID={TokenDetailsIds.holderRow.POSITION_VALUE}
          >
            {valueLabel}
          </Text>
        ) : null}
        {pnlLabel ? (
          <Text
            variant={TextVariant.BodySm}
            twClassName={
              item.isPnlPositive ? 'text-success-default' : 'text-error-default'
            }
            testID={TokenDetailsIds.holderRow.PNL_PERCENT}
          >
            {pnlLabel}
          </Text>
        ) : null}
      </Box>
    </Box>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={TokenDetailsIds.holderRow.PRESS}
    >
      {content}
    </Pressable>
  );
};

export default TokenHolderRow;
