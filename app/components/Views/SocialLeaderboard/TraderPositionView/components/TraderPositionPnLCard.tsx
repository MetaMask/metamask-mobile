import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { formatPnl } from '../../../../UI/Perps/utils/formatUtils';
import { formatUsd, formatPercent } from '../../utils/formatters';

export interface TraderPositionPnLCardProps {
  isClosed: boolean;
  positionValue: number | null | undefined;
  pnlValue: number | null | undefined;
  pnlPercent: number | null;
  isPnlPositive: boolean;
}

const TraderPositionPnLCard: React.FC<TraderPositionPnLCardProps> = ({
  isClosed,
  positionValue,
  pnlValue,
  pnlPercent,
  isPnlPositive,
}) => (
  <Box twClassName="mx-4 p-4 bg-muted rounded-2xl">
    <Box
      flexDirection={BoxFlexDirection.Row}
      justifyContent={BoxJustifyContent.Between}
      alignItems={BoxAlignItems.Center}
    >
      {isClosed ? (
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {strings('social_leaderboard.trader_position.closed_position')}
        </Text>
      ) : (
        <Box>
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
          >
            {formatUsd(positionValue)}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {strings('social_leaderboard.trader_position.position')}
          </Text>
        </Box>
      )}
      <Box alignItems={BoxAlignItems.End}>
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Bold}
          twClassName={
            isPnlPositive ? 'text-success-default' : 'text-error-default'
          }
        >
          {pnlValue != null ? formatPnl(pnlValue) : '\u2014'}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {formatPercent(pnlPercent)}
        </Text>
      </Box>
    </Box>
  </Box>
);

export default TraderPositionPnLCard;
