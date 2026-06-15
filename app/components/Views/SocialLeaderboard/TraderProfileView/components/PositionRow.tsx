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
import PositionTokenAvatar from '../../components/PositionTokenAvatar';
import PerpBadges from '../../components/PerpBadges';
import {
  getPerpPositionDirection,
  isClosedPosition,
  isPerpPosition,
} from '../../utils/perp';
import { formatPnl } from '../../../../UI/Perps/utils/formatUtils';
import {
  formatUsd,
  formatTokenAmount,
  formatPercent,
  formatTradeDate,
} from '../../utils/formatters';

export interface PositionRowProps {
  position: Position;
  onPress?: (position: Position) => void;
  /**
   * Authoritative closed/open flag from the list the row belongs to (e.g. the
   * profile's Closed tab). Falls back to {@link isClosedPosition} when omitted.
   */
  isClosed?: boolean;
}

const PositionRow: React.FC<PositionRowProps> = ({
  position,
  onPress,
  isClosed: isClosedProp,
}) => {
  const isClosed = isClosedProp ?? isClosedPosition(position);
  const isPerp = isPerpPosition(position);

  const closedPnlPercent =
    position.boughtUsd > 0
      ? (position.realizedPnl / position.boughtUsd) * 100
      : null;

  // Perps don't carry meaningful spot proceeds/current value, so surface their
  // realized/unrealized PnL ($ + %) instead. Spot keeps soldUsd-on-close /
  // currentValueUSD-while-open.
  const perpPnlValue = position.pnlValueUsd ?? position.realizedPnl ?? null;

  const displayValue = isPerp
    ? perpPnlValue
    : isClosed
      ? position.soldUsd
      : (position.currentValueUSD ?? null);

  const displayPnlPercent = isPerp
    ? (position.pnlPercent ?? closedPnlPercent)
    : isClosed
      ? closedPnlPercent
      : position.pnlPercent;
  const hasPnl = displayPnlPercent != null;
  const isPnlPositive = hasPnl && (displayPnlPercent ?? 0) >= 0;
  const testID = `position-row-${position.tokenSymbol}`;

  const perpDirection = getPerpPositionDirection(position);

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
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              numberOfLines={1}
              twClassName="shrink"
            >
              {position.tokenSymbol}
            </Text>
            {perpDirection ? (
              <PerpBadges
                direction={perpDirection}
                leverage={position.perpLeverage}
                testID={`position-row-perp-badges-${position.tokenSymbol}`}
              />
            ) : null}
          </Box>
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
        {isPerp ? (
          // Keep the absolute amount neutral and let the percentage below carry
          // the red/green, matching spot rows (the $ figure is just a number;
          // the % conveys the gain/loss).
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {perpPnlValue != null ? formatPnl(perpPnlValue) : '—'}
          </Text>
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {formatUsd(displayValue)}
          </Text>
        )}
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
