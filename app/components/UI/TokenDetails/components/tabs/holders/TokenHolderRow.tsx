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
import TraderAvatar from '../../../../SocialFeed/components/TraderAvatar';
import type { TraderFeedRow } from '../../../../SocialFeed/types';
import {
  formatAbbreviatedUsd,
  formatFollowerCountLabel,
  formatPercent,
  formatSignedAbbreviatedUsd,
} from '../../../../SocialFeed/utils/formatters';
import { TokenDetailsIds } from '../../../testIds';

/** Matches the avatar size on the Social V1 feed's identity row. */
const AVATAR_SIZE = 32;

const isPresentNumber = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value);

export interface TokenHolderRowProps {
  row: TraderFeedRow;
}

/**
 * One holder of the token on screen: who they are, and what they hold.
 *
 * The right-hand column is size over P&L. The size is a holding, not a
 * result, so it carries no `+`/`-` and no color -- only the unrealized P&L
 * beneath it is colored: in dollars for a perp, as a percent for spot. The
 * agreed design drops the rank medal, win-rate tag and follow button the old
 * leaderboard row had.
 */
const TokenHolderRow: React.FC<TokenHolderRowProps> = ({ row }) => {
  const { item, core } = row;
  // Left in USD for now, as the API prices it. Converting to the viewer's
  // currency is a deliberate follow-up, not an oversight.
  // Abbreviated so a whale's holding keeps the column one line. A perp's
  // `currentValueUSD` is its equity, which does not follow the list's order,
  // so it is only the fallback when the API omits `positionValueUSD`.
  let valueLabel = '';
  if (isPresentNumber(core.positionValueUSD)) {
    valueLabel = formatAbbreviatedUsd(core.positionValueUSD);
  } else if (item.hasValueData) {
    valueLabel = formatAbbreviatedUsd(core.currentValueUSD);
  }
  const showPnlUsd = item.type === 'perps' && isPresentNumber(core.pnlValueUsd);
  let pnlLabel = '';
  if (showPnlUsd) {
    pnlLabel = formatSignedAbbreviatedUsd(core.pnlValueUsd);
  } else if (item.hasPnlData) {
    pnlLabel = formatPercent(core.pnlPercent);
  }

  return (
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
            testID={
              showPnlUsd
                ? TokenDetailsIds.holderRow.PNL_VALUE
                : TokenDetailsIds.holderRow.PNL_PERCENT
            }
          >
            {pnlLabel}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
};

export default TokenHolderRow;
