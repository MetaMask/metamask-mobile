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
import AnimatedNumericText from '../../../../component-library/components-temp/AnimatedNumericText/AnimatedNumericText';
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
 * Both layouts share this header. The symbol sits beside a side tag, a caption
 * sits under it, and the P&L sits on the right. Closed cards use the caption
 * for when the position settled (`Closed · 2 hr ago`, `Sold · 2 hr ago`) and
 * omit the spot side tag.
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
  /** P&L as a percent. Sits under the USD figure. */
  pnlLabel: string;
  /** P&L in USD. Leads the right-hand column. */
  pnlValueLabel?: string;
  isPnlPositive: boolean;
  direction?: SocialV1PerpDirection;
  leverageLabel?: string;
  /** Current price, market cap, or the closed-card age caption. */
  subtitleLabel?: string;
  side?: SocialV1SpotSide;
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
      gap={3}
      twClassName="w-full min-w-0"
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
        {/* Glyph row, not the slot reel: AnimatedSlotText sizes each digit to a
            `0` but measures the real glyphs. Inter digits are proportional, so a
            `1` leaves the reel wider than its measured box and the K or % overruns
            the column. */}
        {pnlValueLabel && live ? (
          <AnimatedNumericText
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
          <AnimatedNumericText
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

const PositionCardHeader: React.FC<PositionCardHeaderProps> = (props) => (
  <OpenHeader
    {...props}
    testID={
      props.testID ??
      (props.layout === 'closed' ? 'position-card-header-closed' : undefined)
    }
  />
);

export default PositionCardHeader;
