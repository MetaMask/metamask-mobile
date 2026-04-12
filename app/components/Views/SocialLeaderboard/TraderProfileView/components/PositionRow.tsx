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
  AvatarBase,
  AvatarBaseSize,
} from '@metamask/design-system-react-native';
import type { Position } from '@metamask/social-controllers';

export interface PositionRowProps {
  position: Position;
  onPress?: (position: Position) => void;
}

function formatUsd(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(0)}%`;
}

const PositionRow: React.FC<PositionRowProps> = ({ position, onPress }) => {
  const hasPnl = position.pnlPercent != null;
  const isPnlPositive = hasPnl && (position.pnlPercent ?? 0) >= 0;

  const content = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="px-4 py-3"
      testID={`position-row-${position.tokenSymbol}`}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={4}
        twClassName="flex-1 min-w-0 mr-3"
      >
        <AvatarBase
          size={AvatarBaseSize.Lg}
          fallbackText={position.tokenSymbol.charAt(0).toUpperCase()}
        />

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
            color={TextColor.TextMuted}
            numberOfLines={1}
          >
            {`${position.positionAmount.toLocaleString()} ${position.tokenSymbol}`}
          </Text>
        </Box>
      </Box>

      <Box alignItems={BoxAlignItems.FlexEnd}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {formatUsd(position.currentValueUSD)}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={hasPnl ? undefined : TextColor.TextMuted}
          twClassName={
            hasPnl
              ? isPnlPositive
                ? 'text-success-default'
                : 'text-error-default'
              : undefined
          }
        >
          {formatPercent(position.pnlPercent)}
        </Text>
      </Box>
    </Box>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={() => onPress(position)}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export default PositionRow;
