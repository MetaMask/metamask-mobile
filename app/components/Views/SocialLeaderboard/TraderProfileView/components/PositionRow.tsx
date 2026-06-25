import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import type { Position } from '@metamask/social-controllers';
import PerpBadges from '../../components/PerpBadges';
import PositionTokenAvatar from '../../components/PositionTokenAvatar';
import {
  formatPercent,
  formatSignedUsd,
  formatTokenAmount,
  formatTradeDate,
  formatUsd,
} from '../../utils/formatters';
import { getPerpPositionDirection, isPerpPosition } from '../../utils/perp';

export interface PositionRowProps {
  position: Position;
  onPress?: (position: Position) => void;
  /**
   * Authoritative closed/open flag from the list the row belongs to (e.g. the
   * profile's Closed tab). Falls back to {@link isClosedPosition} when omitted.
   */
  isClosed?: boolean;
  showTradeDate?: boolean;
}

const PositionRowComponent: React.FC<PositionRowProps> = ({
  position,
  onPress,
  isClosed: isClosedProp,
  showTradeDate,
}) => {
  // Honor main's spot closed-detection; the explicit prop (from the profile's
  // Open/Closed tab) overrides it, which perps rely on.
  const isClosed =
    isClosedProp ?? (position.positionAmount === 0 && position.soldUsd > 0);
  const isPerp = isPerpPosition(position);

  const closedPnlPercent =
    position.boughtUsd > 0
      ? (position.realizedPnl / position.boughtUsd) * 100
      : null;

  const displayPnlPercent = isClosed ? closedPnlPercent : position.pnlPercent;
  const hasPnlPercent = displayPnlPercent != null;
  // Perps surface realized/unrealized PnL ($) as the headline figure rather
  // than spot proceeds / current value.
  const perpPnlValue = position.pnlValueUsd ?? position.realizedPnl ?? null;
  const pnlSignSource = isPerp
    ? perpPnlValue
    : isClosed
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

  // Strip the HIP-3 provider prefix for display (`xyz:SPCX` → `SPCX`);
  // non-HIP-3 symbols pass through unchanged. testIDs keep the raw symbol.
  const displaySymbol = getPerpsDisplaySymbol(position.tokenSymbol);

  const perpDirection = getPerpPositionDirection(position);

  const handlePress = useCallback(() => {
    onPress?.(position);
  }, [onPress, position]);

  // Open positions — perp and spot alike — show the current position value in
  // neutral white (matching spot). Closed positions show signed, colored
  // realized PnL: perps via `perpPnlValue` (realized + unrealized), spot via
  // `realizedPnl`.
  const topRight = !isClosed ? (
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextDefault}
    >
      {formatUsd(position.currentValueUSD ?? null)}
    </Text>
  ) : isPerp ? (
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      twClassName={pnlColorClass}
      color={pnlColorClass ? undefined : TextColor.TextAlternative}
    >
      {perpPnlValue != null ? formatSignedUsd(perpPnlValue) : '—'}
    </Text>
  ) : (
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      twClassName={pnlColorClass}
      color={pnlColorClass ? undefined : TextColor.TextAlternative}
    >
      {formatSignedUsd(position.realizedPnl)}
    </Text>
  );

  // All positions — open and closed, perp and spot — render a directional
  // triangle (▲/▼) alongside an unsigned percentage, both colored by direction
  // (green up / red down). A break-even position shows a neutral minus and a
  // neutral percentage. The sign lives in the caret, so the percent is unsigned.
  const bottomRight = (
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
        <Text variant={TextVariant.BodySm} twClassName={pnlColorClass}>
          {isPnlPositive ? '▲' : '▼'}
        </Text>
      )}
      <Text
        variant={TextVariant.BodySm}
        twClassName={pnlColorClass}
        color={pnlColorClass ? undefined : TextColor.TextAlternative}
      >
        {formatPercent(displayPnlPercent, { showSign: false })}
      </Text>
    </Box>
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
              {displaySymbol}
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
            {isClosed || showTradeDate
              ? formatTradeDate(position.lastTradeAt)
              : `${formatTokenAmount(
                  isPerp
                    ? Math.abs(
                        position.positionAmountWithLeverage ??
                          position.positionAmount,
                      )
                    : position.positionAmount,
                )} ${displaySymbol}`}
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
      <TouchableOpacity onPress={handlePress} testID={testID}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const PositionRow = React.memo(PositionRowComponent);

export default PositionRow;
