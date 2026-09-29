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
import PositionTokenAvatar, {
  type PositionTokenAvatarData,
} from '../../../components/PositionTokenAvatar';
import type { SocialV1PerpDirection, SocialV1SpotSide } from '../types';
import PositionCardTitleMeta, {
  type PositionCardHeaderLayout,
} from './PositionCardTitleMeta';

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
        <PositionCardTitleMeta
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
