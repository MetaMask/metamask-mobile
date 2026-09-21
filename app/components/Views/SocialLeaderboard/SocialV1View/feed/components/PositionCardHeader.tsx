import {
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import PositionTokenAvatar, {
  type PositionTokenAvatarData,
} from '../../../components/PositionTokenAvatar';
import type { SocialV1PerpDirection, SocialV1SpotSide } from '../types';

const DIRECTION_I18N: Record<SocialV1PerpDirection, string> = {
  long: 'social_leaderboard.trader_position.long',
  short: 'social_leaderboard.trader_position.short',
};

const SIDE_I18N: Record<SocialV1SpotSide, string> = {
  buy: 'social_leaderboard.feed.position_card.buy',
  sell: 'social_leaderboard.feed.position_card.sell',
};

/**
 * `open` leads with current value on the right; `closed` stacks a hero realized
 * P&L under the identity. Both are used by perps and spot alike -- the asset
 * class only changes which stat rows follow.
 */
export type PositionCardHeaderLayout = 'open' | 'closed';

export interface PositionCardHeaderProps {
  layout: PositionCardHeaderLayout;
  avatar: PositionTokenAvatarData;
  symbol: string;
  valueLabel: string;
  pnlLabel: string;
  isPnlPositive: boolean;
  direction?: SocialV1PerpDirection;
  leverageLabel?: string;
  markPriceLabel?: string;
  side?: SocialV1SpotSide;
}

const pnlClassName = (isPnlPositive: boolean) =>
  isPnlPositive ? 'text-success-default' : 'text-error-default';

const directionClassName = (direction: SocialV1PerpDirection) =>
  direction === 'long' ? 'text-success-default' : 'text-error-default';

const TitleMeta: React.FC<{
  layout: PositionCardHeaderLayout;
  symbol: string;
  direction?: SocialV1PerpDirection;
  leverageLabel?: string;
  side?: SocialV1SpotSide;
}> = ({ layout, symbol, direction, leverageLabel, side }) => (
  // No `flex-1`: this row's parent is a column, so `flex-1` would resolve
  // against the height and give the row a zero basis. The open layout hides
  // that -- its mark-price sibling gives the column height to grow into -- but
  // on a closed card this is the only child, and the title vanished.
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
          {layout === 'closed' && leverageLabel
            ? `${leverageLabel} ${strings(DIRECTION_I18N[direction])}`
            : strings(DIRECTION_I18N[direction])}
        </Text>
      </>
    ) : null}
    {/* Rendered exactly like a perp direction -- same size, same separator,
      same green/red -- so Buy/Sell and Long/Short read as one column of
      information across the feed rather than two different treatments. */}
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

const PnlValues: React.FC<{
  layout: PositionCardHeaderLayout;
  valueLabel: string;
  pnlLabel: string;
  isPnlPositive: boolean;
}> = ({ layout, valueLabel, pnlLabel, isPnlPositive }) => {
  const isClosedHero = layout === 'closed';

  return (
    <Box alignItems={isClosedHero ? BoxAlignItems.Start : BoxAlignItems.End}>
      <Text
        variant={isClosedHero ? TextVariant.HeadingMd : TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={isClosedHero ? undefined : TextColor.TextDefault}
        twClassName={isClosedHero ? pnlClassName(isPnlPositive) : undefined}
        numberOfLines={1}
      >
        {valueLabel}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        twClassName={pnlClassName(isPnlPositive)}
        numberOfLines={1}
      >
        {pnlLabel}
      </Text>
    </Box>
  );
};

const PositionCardHeader: React.FC<PositionCardHeaderProps> = ({
  layout,
  avatar,
  symbol,
  valueLabel,
  pnlLabel,
  isPnlPositive,
  direction,
  leverageLabel,
  markPriceLabel,
  side,
}) => {
  const identity = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={3}
      // `flex-1` only makes sense in the open layout, where this row shares a
      // Row with the values column. The closed layout stacks them, and there
      // `flex-1` resolves against the *height* -- collapsing this row to zero,
      // which left the fixed-size avatar painting over a title that had no box
      // to lay out in.
      twClassName={layout === 'closed' ? 'w-full min-w-0' : 'flex-1 min-w-0'}
    >
      <PositionTokenAvatar position={avatar} size={AvatarTokenSize.Md} />
      <Box twClassName="flex-1 min-w-0">
        <TitleMeta
          layout={layout}
          symbol={symbol}
          direction={direction}
          leverageLabel={leverageLabel}
          side={side}
        />
        {layout === 'open' && markPriceLabel ? (
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {markPriceLabel}
          </Text>
        ) : null}
      </Box>
    </Box>
  );

  const values = (
    <PnlValues
      layout={layout}
      valueLabel={valueLabel}
      pnlLabel={pnlLabel}
      isPnlPositive={isPnlPositive}
    />
  );

  if (layout === 'closed') {
    return (
      <Box twClassName="gap-2">
        {identity}
        {values}
      </Box>
    );
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={3}
    >
      {identity}
      {values}
    </Box>
  );
};

export default PositionCardHeader;
