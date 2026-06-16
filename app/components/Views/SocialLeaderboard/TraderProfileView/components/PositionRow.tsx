import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
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
import PositionTokenAvatar from '../../components/PositionTokenAvatar';
import {
  formatUsd,
  formatSignedUsd,
  formatTokenAmount,
  formatPercent,
  formatTradeDate,
} from '../../utils/formatters';

const styles = StyleSheet.create({
  caret: { fontSize: 8 },
});

export interface PositionRowProps {
  position: Position;
  onPress?: (position: Position) => void;
}

const PositionRow: React.FC<PositionRowProps> = ({ position, onPress }) => {
  const isClosed = position.positionAmount === 0 && position.soldUsd > 0;

  const closedPnlPercent =
    isClosed && position.boughtUsd > 0
      ? (position.realizedPnl / position.boughtUsd) * 100
      : null;

  const displayPnlPercent = isClosed ? closedPnlPercent : position.pnlPercent;
  const hasPnlPercent = displayPnlPercent != null;
  const pnlSignSource = isClosed
    ? position.realizedPnl
    : (position.pnlValueUsd ?? displayPnlPercent ?? null);
  const isPnlZero = pnlSignSource === 0;
  const isPnlPositive = pnlSignSource != null && pnlSignSource > 0;
  const pnlColorClass =
    pnlSignSource == null || isPnlZero
      ? undefined
      : isPnlPositive
        ? 'text-success-default'
        : 'text-error-default';

  const testID = `position-row-${position.tokenSymbol}`;

  const topRight = isClosed ? (
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      twClassName={pnlColorClass}
      color={pnlColorClass ? undefined : TextColor.TextAlternative}
    >
      {formatSignedUsd(position.realizedPnl)}
    </Text>
  ) : (
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextDefault}
    >
      {formatUsd(position.currentValueUSD ?? null)}
    </Text>
  );

  const bottomRight = isClosed ? (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={1}
    >
      {!hasPnlPercent ? null : isPnlZero ? (
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {'−'}
        </Text>
      ) : (
        <Text
          variant={TextVariant.BodyXs}
          twClassName={pnlColorClass}
          style={styles.caret}
        >
          {isPnlPositive ? '▲' : '▼'}
        </Text>
      )}
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {formatPercent(displayPnlPercent).replace(/^[+-]/, '')}
      </Text>
    </Box>
  ) : (
    <Text
      variant={TextVariant.BodySm}
      twClassName={pnlColorClass}
      color={pnlColorClass ? undefined : TextColor.TextAlternative}
    >
      {position.pnlValueUsd != null
        ? `${formatSignedUsd(position.pnlValueUsd)} (${formatPercent(displayPnlPercent)})`
        : formatPercent(displayPnlPercent)}
    </Text>
  );

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
        <PositionTokenAvatar position={position} showChainBadge />

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
              ? formatTradeDate(position.lastTradeAt)
              : `${formatTokenAmount(position.positionAmount)} ${position.tokenSymbol}`}
          </Text>
        </Box>
      </Box>

      <Box alignItems={BoxAlignItems.End}>
        {topRight}
        {bottomRight}
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
