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
import { getPerpPositionDirection, isPerpPosition } from '../../utils/perp';
import {
  formatUsd,
  formatSignedUsd,
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

  const perpDirection = getPerpPositionDirection(position);

  const topRight = isPerp ? (
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      twClassName={pnlColorClass}
      color={pnlColorClass ? undefined : TextColor.TextAlternative}
    >
      {perpPnlValue != null ? formatSignedUsd(perpPnlValue) : '—'}
    </Text>
  ) : isClosed ? (
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

  // Closed positions — spot and perp alike — render the directional triangle
  // alongside a neutral-colored, unsigned percentage; open positions render a
  // colored, signed percentage. Keyed on `isClosed` only (not `isPerp`) so a
  // closed perp matches the spot styling rather than showing a colored percent
  // with no triangle.
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
        <Text variant={TextVariant.BodySm} twClassName={pnlColorClass}>
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
      {formatPercent(displayPnlPercent)}
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
              : `${formatTokenAmount(
                  isPerp
                    ? Math.abs(
                        position.positionAmountWithLeverage ??
                          position.positionAmount,
                      )
                    : position.positionAmount,
                )} ${position.tokenSymbol}`}
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
