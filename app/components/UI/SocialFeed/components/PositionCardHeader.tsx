import {
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../locales/i18n';
import AnimatedSlotText from '../../../../component-library/components-temp/AnimatedNumericText/AnimatedSlotText';
import PositionTokenAvatar, {
  type PositionTokenAvatarData,
} from './PositionTokenAvatar';
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
 * Both layouts lead with the token; they differ in what sits beside it. `open`
 * tags the side, quotes the current price or market cap underneath, and puts
 * the running P&L on the right; `closed` demotes the title to a caption above
 * the settled result and puts the close time on the right.
 */
export type PositionCardHeaderLayout = 'open' | 'closed';

/** Set while an open card follows a streamed price. */
export interface PositionCardHeaderLiveState {
  reduceMotion: boolean;
}

export interface PositionCardHeaderProps {
  layout: PositionCardHeaderLayout;
  avatar: PositionTokenAvatarData;
  symbol: string;
  /** Realized P&L on a closed card, merged into the result line. */
  valueLabel: string;
  /** P&L as a percent. Sits under the USD figure on the open card. */
  pnlLabel: string;
  /** P&L in USD. Leads the open card's right-hand column. */
  pnlValueLabel?: string;
  isPnlPositive: boolean;
  direction?: SocialV1PerpDirection;
  leverageLabel?: string;
  /** Current price, or market cap for spot, under the open card's title. */
  subtitleLabel?: string;
  side?: SocialV1SpotSide;
  /** `Closed 2 hr ago`, right-aligned on the closed card. */
  closedAgeLabel?: string;
  /** Open layout only: roll the figures as live ticks arrive. */
  live?: PositionCardHeaderLiveState;
  testID?: string;
}

const pnlClassName = (isPnlPositive: boolean) =>
  isPnlPositive ? 'text-success-default' : 'text-error-default';

const pnlColor = (isPnlPositive: boolean) =>
  isPnlPositive ? TextColor.SuccessDefault : TextColor.ErrorDefault;

/** `15x Short`, `Long`, `Buy`. Empty when the card carries neither. */
const sideTagLabel = ({
  direction,
  leverageLabel,
  side,
}: Pick<
  PositionCardHeaderProps,
  'direction' | 'leverageLabel' | 'side'
>): string => {
  if (direction) {
    return [leverageLabel, strings(DIRECTION_I18N[direction])]
      .filter(Boolean)
      .join(' ');
  }
  return side ? strings(SIDE_I18N[side]) : '';
};

const isBullish = ({
  direction,
  side,
}: Pick<PositionCardHeaderProps, 'direction' | 'side'>): boolean =>
  direction ? direction === 'long' : side !== 'sell';

/**
 * `BTC · 15x Long` on a closed perp. A closed spot card shows the bare symbol:
 * its side is spent, and the toned border already says how it ended.
 */
const closedTitle = (props: PositionCardHeaderProps): string => {
  const meta = props.direction ? sideTagLabel(props) : '';
  return meta ? `${props.symbol} \u00b7 ${meta}` : props.symbol;
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

const ClosedHeader: React.FC<PositionCardHeaderProps> = (props) => {
  const { avatar, valueLabel, pnlLabel, isPnlPositive, closedAgeLabel } = props;
  const result = closedResult(valueLabel, pnlLabel);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={2}
      twClassName="w-full min-w-0"
      testID={props.testID ?? 'position-card-header-closed'}
    >
      <PositionTokenAvatar position={avatar} size={AvatarTokenSize.Md} />
      <Box twClassName="flex-1 min-w-0">
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {closedTitle(props)}
        </Text>
        {result ? (
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            twClassName={pnlClassName(isPnlPositive)}
            numberOfLines={1}
          >
            {result}
          </Text>
        ) : null}
      </Box>
      {closedAgeLabel ? (
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextMuted}
          numberOfLines={1}
          twClassName="self-start shrink-0"
        >
          {closedAgeLabel}
        </Text>
      ) : null}
    </Box>
  );
};

const OpenHeader: React.FC<PositionCardHeaderProps> = (props) => {
  const {
    avatar,
    symbol,
    pnlLabel,
    pnlValueLabel,
    isPnlPositive,
    subtitleLabel,
    live,
  } = props;
  const tagLabel = sideTagLabel(props);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={2}
      testID={props.testID}
    >
      <PositionTokenAvatar position={avatar} size={AvatarTokenSize.Md} />
      <Box twClassName="flex-1 min-w-0">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          {/* `shrink` so a long symbol truncates before the tag does. */}
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={1}
            twClassName="shrink"
          >
            {symbol}
          </Text>
          {tagLabel ? (
            <Tag
              severity={
                isBullish(props) ? TagSeverity.Success : TagSeverity.Danger
              }
              twClassName="shrink-0"
            >
              {tagLabel}
            </Tag>
          ) : null}
        </Box>
        {subtitleLabel && live ? (
          <AnimatedSlotText
            animated={!live.reduceMotion}
            color={TextColor.TextAlternative}
            fontWeight={FontWeight.Medium}
            testID={props.testID && `${props.testID}-subtitle`}
            value={subtitleLabel}
            variant={TextVariant.BodyXs}
          />
        ) : null}
        {subtitleLabel && !live ? (
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {subtitleLabel}
          </Text>
        ) : null}
      </Box>
      {/* Capped rather than free-growing: a six-figure P&L would otherwise take
        the row and squeeze the symbol it belongs to down to an ellipsis. */}
      <Box
        alignItems={BoxAlignItems.End}
        twClassName="shrink-0 max-w-[45%] min-w-0"
      >
        {pnlValueLabel && live ? (
          <AnimatedSlotText
            animated={!live.reduceMotion}
            color={pnlColor(isPnlPositive)}
            fontWeight={FontWeight.Medium}
            testID={props.testID && `${props.testID}-pnl-value`}
            value={pnlValueLabel}
            variant={TextVariant.BodySm}
          />
        ) : null}
        {pnlValueLabel && !live ? (
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            twClassName={pnlClassName(isPnlPositive)}
            numberOfLines={1}
          >
            {pnlValueLabel}
          </Text>
        ) : null}
        {pnlLabel && live ? (
          <AnimatedSlotText
            animated={!live.reduceMotion}
            color={pnlColor(isPnlPositive)}
            fontWeight={FontWeight.Medium}
            testID={props.testID && `${props.testID}-pnl`}
            value={pnlLabel}
            variant={TextVariant.BodyXs}
          />
        ) : null}
        {pnlLabel && !live ? (
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            twClassName={pnlClassName(isPnlPositive)}
            numberOfLines={1}
          >
            {pnlLabel}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
};

const PositionCardHeader: React.FC<PositionCardHeaderProps> = (props) =>
  props.layout === 'closed' ? (
    <ClosedHeader {...props} />
  ) : (
    <OpenHeader {...props} />
  );

export default PositionCardHeader;
