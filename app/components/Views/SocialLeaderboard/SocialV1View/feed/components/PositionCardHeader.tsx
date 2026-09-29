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

/** Past tense once the position is gone: `PEPE · Sold`, not `PEPE · Sell`. */
const CLOSED_SIDE_I18N: Record<SocialV1SpotSide, string> = {
  buy: 'social_leaderboard.feed.position_card.bought',
  sell: 'social_leaderboard.feed.position_card.sold',
};

/**
 * Both layouts lead with the same title line; they differ in what sits under and
 * beside it. `open` puts the mark price below and the running P&L on the right;
 * `closed` puts the settled result directly under the title, because there is no
 * live price left to quote.
 */
export type PositionCardHeaderLayout = 'open' | 'closed';

export interface PositionCardHeaderProps {
  layout: PositionCardHeaderLayout;
  avatar: PositionTokenAvatarData;
  symbol: string;
  /** Realized P&L on a closed card, merged into the result line. */
  valueLabel: string;
  /** P&L as a percent. Leads the open card's right-hand column. */
  pnlLabel: string;
  /** P&L in USD. Sits under the percent on the open card. */
  pnlValueLabel?: string;
  isPnlPositive: boolean;
  direction?: SocialV1PerpDirection;
  leverageLabel?: string;
  markPriceLabel?: string;
  side?: SocialV1SpotSide;
}

const pnlClassName = (isPnlPositive: boolean) =>
  isPnlPositive ? 'text-success-default' : 'text-error-default';

/**
 * `BTC · 40x Short`, `PEPE · Sold`. One uninterrupted string so it truncates as a
 * unit, and one colour, because the P&L beside or below it carries the green/red.
 */
const cardTitle = ({
  layout,
  symbol,
  direction,
  leverageLabel,
  side,
}: Pick<
  PositionCardHeaderProps,
  'layout' | 'symbol' | 'direction' | 'leverageLabel' | 'side'
>): string => {
  let meta = '';
  if (direction) {
    meta = [leverageLabel, strings(DIRECTION_I18N[direction])]
      .filter(Boolean)
      .join(' ');
  } else if (side) {
    meta = strings(
      layout === 'closed' ? CLOSED_SIDE_I18N[side] : SIDE_I18N[side],
    );
  }
  return meta ? `${symbol} \u00b7 ${meta}` : symbol;
};

/**
 * `+$96,378.60 (+38.2%)`. Either half can be missing -- `mapFeedItem` emits an
 * empty label for a figure the row did not report -- so the parentheses only
 * appear when there is something to put in them.
 */
const closedResult = (valueLabel: string, pnlLabel: string): string => {
  if (valueLabel && pnlLabel) {
    return `${valueLabel} (${pnlLabel})`;
  }
  return valueLabel || pnlLabel;
};

const ClosedResult: React.FC<{
  valueLabel: string;
  pnlLabel: string;
  isPnlPositive: boolean;
}> = ({ valueLabel, pnlLabel, isPnlPositive }) => {
  const result = closedResult(valueLabel, pnlLabel);
  if (!result) {
    return null;
  }

  return (
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      twClassName={pnlClassName(isPnlPositive)}
      numberOfLines={1}
    >
      {result}
    </Text>
  );
};

const PositionCardHeader: React.FC<PositionCardHeaderProps> = ({
  layout,
  avatar,
  symbol,
  valueLabel,
  pnlLabel,
  pnlValueLabel,
  isPnlPositive,
  direction,
  leverageLabel,
  markPriceLabel,
  side,
}) => {
  const title = cardTitle({ layout, symbol, direction, leverageLabel, side });
  const titleColor =
    layout === 'closed' ? TextColor.TextAlternative : TextColor.TextDefault;

  const identity = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={2}
      twClassName="flex-1 min-w-0"
    >
      <PositionTokenAvatar position={avatar} size={AvatarTokenSize.Md} />
      <Box twClassName="flex-1 min-w-0 gap-1">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={titleColor}
          numberOfLines={1}
        >
          {title}
        </Text>
        {layout === 'closed' ? (
          <ClosedResult
            valueLabel={valueLabel}
            pnlLabel={pnlLabel}
            isPnlPositive={isPnlPositive}
          />
        ) : (
          markPriceLabel && (
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {markPriceLabel}
            </Text>
          )
        )}
      </Box>
    </Box>
  );

  if (layout === 'closed') {
    return identity;
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Start}
      gap={2}
    >
      {identity}
      {/* Capped rather than free-growing: a six-figure P&L would otherwise take
        the row and squeeze the symbol it belongs to down to an ellipsis. */}
      <Box
        alignItems={BoxAlignItems.End}
        twClassName="shrink-0 max-w-[45%] min-w-0"
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName={pnlClassName(isPnlPositive)}
          numberOfLines={1}
        >
          {pnlLabel}
        </Text>
        {pnlValueLabel ? (
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            twClassName={pnlClassName(isPnlPositive)}
            numberOfLines={1}
          >
            {pnlValueLabel}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
};

export default PositionCardHeader;
