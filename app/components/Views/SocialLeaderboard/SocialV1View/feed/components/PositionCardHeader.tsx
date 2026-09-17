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

export type PositionCardHeaderLayout = 'open' | 'closed' | 'compact';

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
  subHeaderLabel?: string;
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
    {side ? (
      <Box twClassName="bg-muted rounded-md px-1.5">
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          twClassName={
            side === 'buy' ? 'text-success-default' : 'text-error-default'
          }
        >
          {strings(SIDE_I18N[side])}
        </Text>
      </Box>
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
        variant={isClosedHero ? TextVariant.BodyMd : TextVariant.BodySm}
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
  subHeaderLabel,
}) => {
  const identity = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={3}
      twClassName="flex-1 min-w-0"
    >
      <PositionTokenAvatar
        position={avatar}
        size={AvatarTokenSize.Md}
        showChainBadge={layout === 'compact'}
      />
      <Box twClassName="flex-1 min-w-0">
        <TitleMeta
          layout={layout}
          symbol={symbol}
          direction={direction}
          leverageLabel={leverageLabel}
          side={side}
        />
        {layout === 'open' && markPriceLabel ? (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {markPriceLabel}
          </Text>
        ) : null}
        {layout === 'compact' && subHeaderLabel ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {subHeaderLabel}
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
