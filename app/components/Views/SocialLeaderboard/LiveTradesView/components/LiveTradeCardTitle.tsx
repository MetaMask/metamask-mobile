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
import { strings } from '../../../../../../locales/i18n';
import type {
  SocialV1PerpDirection,
  SocialV1SpotSide,
} from '../../../../UI/SocialFeed/types';

export interface LiveTradeCardTitleProps {
  symbol: string;
  direction?: SocialV1PerpDirection;
  leverageLabel?: string;
  side?: SocialV1SpotSide;
}

const DIRECTION_I18N: Record<SocialV1PerpDirection, string> = {
  long: 'social_leaderboard.trader_position.long',
  short: 'social_leaderboard.trader_position.short',
};

const SIDE_I18N: Record<SocialV1SpotSide, string> = {
  buy: 'social_leaderboard.feed.position_card.buy',
  sell: 'social_leaderboard.feed.position_card.sell',
};

const directionClassName = (direction: SocialV1PerpDirection) =>
  direction === 'long' ? 'text-success-default' : 'text-error-default';

/**
 * `SOL · 10x Long`, `AMD · Buy`. The title line of a Live trades card.
 *
 * Unlike the feed's `PositionCardHeader`, which renders one single-coloured
 * string because the P&L beside it carries the green/red, a live trade has no
 * P&L to colour -- so the side is the only thing that can carry it.
 */
const LiveTradeCardTitle: React.FC<LiveTradeCardTitleProps> = ({
  symbol,
  direction,
  leverageLabel,
  side,
}) => (
  // No `flex-1`: this row's parent is a column, so `flex-1` would resolve
  // against the height and give the row a zero basis, collapsing the title.
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    gap={1}
    twClassName="w-full min-w-0"
  >
    {/* `shrink` so a long symbol truncates instead of pushing the
      direction off the row. */}
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextDefault}
      numberOfLines={1}
      twClassName="shrink"
    >
      {symbol}
    </Text>
    {direction ? (
      <>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextMuted}>
          {' \u00b7 '}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName={directionClassName(direction)}
        >
          {leverageLabel
            ? `${leverageLabel} ${strings(DIRECTION_I18N[direction])}`
            : strings(DIRECTION_I18N[direction])}
        </Text>
      </>
    ) : null}
    {/* Rendered exactly like a perp direction -- same size, same separator,
      same green/red -- so Buy/Sell and Long/Short read as one column of
      information down the list rather than two different treatments. */}
    {side ? (
      <>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextMuted}>
          {' \u00b7 '}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName={
            side === 'buy' ? 'text-success-default' : 'text-error-default'
          }
        >
          {strings(SIDE_I18N[side])}
        </Text>
      </>
    ) : null}
  </Box>
);

export default LiveTradeCardTitle;
