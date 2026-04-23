import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import type { Position } from '@metamask/social-controllers';
import { addThousandsSeparator } from '../../utils/numberFormatting';
import PositionTokenAvatar from '../../components/PositionTokenAvatar';
import {
  formatPerpsFiat,
  formatPercentage,
  formatOrderCardDate,
} from '../../../../UI/Perps/utils/formatUtils';

export interface PositionRowProps {
  position: Position;
  onPress?: (position: Position) => void;
}

function formatUsd(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  const sign = value < 0 ? '-' : '';
  return sign + formatPerpsFiat(Math.abs(value), { stripTrailingZeros: false });
}

function formatTokenAmount(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const [whole, frac = ''] = abs.toString().split('.');
  const commaWhole = addThousandsSeparator(whole);
  return frac ? `${sign}${commaWhole}.${frac}` : `${sign}${commaWhole}`;
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  return formatPercentage(value, 0);
}

const PositionRow: React.FC<PositionRowProps> = ({ position, onPress }) => {
  const isClosed = position.positionAmount === 0 && position.soldUsd > 0;

  const displayValue = isClosed
    ? position.soldUsd
    : (position.currentValueUSD ?? null);

  const closedPnlPercent =
    isClosed && position.boughtUsd > 0
      ? (position.realizedPnl / position.boughtUsd) * 100
      : null;

  const displayPnlPercent = isClosed ? closedPnlPercent : position.pnlPercent;
  const hasPnl = displayPnlPercent != null;
  const isPnlPositive = hasPnl && (displayPnlPercent ?? 0) >= 0;
  const testID = `position-row-${position.tokenSymbol}`;

  const content = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="px-4 py-3"
      testID={onPress ? undefined : testID}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={4}
        twClassName="flex-1 min-w-0 mr-3"
      >
        <PositionTokenAvatar position={position} />

        <Box twClassName="flex-1 min-w-0">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={1}
          >
            {position.tokenSymbol}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {isClosed
              ? formatOrderCardDate(position.lastTradeAt)
              : `${formatTokenAmount(position.positionAmount)} ${position.tokenSymbol}`}
          </Text>
        </Box>
      </Box>

      <Box alignItems={BoxAlignItems.End}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {formatUsd(displayValue)}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={hasPnl ? undefined : TextColor.TextAlternative}
          twClassName={
            hasPnl
              ? isPnlPositive
                ? 'text-success-default'
                : 'text-error-default'
              : undefined
          }
        >
          {formatPercent(displayPnlPercent)}
        </Text>
      </Box>
    </Box>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={() => onPress(position)} testID={testID}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export default PositionRow;
