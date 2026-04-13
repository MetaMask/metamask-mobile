import React from 'react';
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
import { StyleSheet } from 'react-native';
import type { Position } from '@metamask/social-controllers';
import TokenImage from '../../../../UI/TokenImage';

const styles = StyleSheet.create({
  tokenIcon: { width: 40, height: 40 },
});

export interface PositionRowProps {
  position: Position;
}

function formatUsd(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  const rounded = Math.round(value * 100) / 100;
  const [whole, frac = ''] = rounded.toString().split('.');
  const paddedFrac = frac.padEnd(2, '0').slice(0, 2);
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${'.'}${paddedFrac}`;
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(0)}%`;
}

const PositionRow: React.FC<PositionRowProps> = ({ position }) => {
  const hasPnl = position.pnlPercent != null;
  const isPnlPositive = hasPnl && (position.pnlPercent ?? 0) >= 0;

  return (
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
        <TokenImage
          asset={{
            address: position.tokenAddress,
            symbol: position.tokenSymbol,
          }}
          containerStyle={styles.tokenIcon}
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
};

export default PositionRow;
