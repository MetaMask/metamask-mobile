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
import { strings } from '../../../../../../locales/i18n';
import PerpBadges from '../../components/PerpBadges';
import PositionTokenAvatar from '../../../../UI/SocialFeed/components/PositionTokenAvatar';
import {
  formatFlaggedPositionAccessibilityLabel,
  getPositionFlagAccessibilityReasonKey,
  getPositionFlagLabelKey,
  type FlaggedPositionPnlDirection,
  type FlaggedPositionPresentation,
} from '../utils/positionFlags';
import {
  EM_DASH,
  formatPercent,
  formatSignedUsd,
  formatTokenAmount,
  formatTradeDate,
  formatUsd,
} from '../../../../UI/SocialFeed/utils/formatters';
import {
  getPerpPositionDirection,
  isPerpPosition,
} from '../../../../UI/SocialFeed/utils/perp';

export interface PositionRowProps {
  position: Position;
  onPress?: (position: Position) => void;
  /**
   * Authoritative closed/open flag from the list the row belongs to (e.g. the
   * profile's Closed tab). Falls back to {@link isClosedPosition} when omitted.
   */
  isClosed?: boolean;
  showTradeDate?: boolean;
  /**
   * Visual treatment for positions that carry server flags.
   * `excluded` greys the row, mutes P&L colour, and shows the long exclusion label on its own line (legacy trader profile).
   * `subline` keeps full opacity and P&L colour, and appends the short flag word to the existing subtitle (V1 profile).
   * Either value ignores `onPress` for flagged rows. Omit it to leave flagged data looking and behaving like an unflagged row.
   */
  flaggedPresentation?: FlaggedPositionPresentation;
}

/** Headline USD for an open row, or signed closed PnL. A closed perp with no PnL is an em dash. */
function formatPositionHeadlineValue(
  isClosed: boolean,
  isPerp: boolean,
  currentValueUSD: number | null | undefined,
  perpPnlValue: number | null,
  realizedPnl: number | null | undefined,
): string {
  if (!isClosed) {
    return formatUsd(currentValueUSD ?? null);
  }
  if (!isPerp) {
    return formatSignedUsd(realizedPnl);
  }
  if (perpPnlValue == null) {
    return EM_DASH;
  }
  return formatSignedUsd(perpPnlValue);
}

/** Screen-reader P&L direction. `null` when the percent is missing. */
function getFlaggedPositionPnlDirection(
  hasPnlPercent: boolean,
  isPnlZero: boolean,
  isPnlPositive: boolean,
): FlaggedPositionPnlDirection | null {
  if (!hasPnlPercent) {
    return null;
  }
  if (isPnlZero) {
    return 'flat';
  }
  if (isPnlPositive) {
    return 'up';
  }
  return 'down';
}

const PositionRowComponent: React.FC<PositionRowProps> = ({
  position,
  onPress,
  isClosed: isClosedProp,
  showTradeDate,
  flaggedPresentation,
}) => {
  // Honor main's spot closed-detection; the explicit prop (from the profile's
  // Open/Closed tab) overrides it, which perps rely on.
  const isClosed =
    isClosedProp ??
    (position.positionAmount === 0 && (position.soldUsd ?? 0) > 0);
  const isPerp = isPerpPosition(position);

  const closedPnlPercent =
    position.boughtUsd != null &&
    position.boughtUsd > 0 &&
    position.realizedPnl != null
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

  const testID = `position-row-${position.tokenSymbol}`;
  const flagLabelKey = flaggedPresentation
    ? getPositionFlagLabelKey(position, flaggedPresentation)
    : null;
  const isFlagged = flagLabelKey != null;
  const isExcluded = flaggedPresentation === 'excluded' && isFlagged;
  const isSublineFlag = flaggedPresentation === 'subline' && isFlagged;
  const isPressable = Boolean(onPress) && !isFlagged;
  // The legacy excluded treatment drops success/error so the signed % and
  // closed PnL look disabled, not just faded green/red under opacity-50.
  // The subline treatment keeps the normal P&L colours.
  const pnlColorClass =
    isExcluded || pnlSignSource == null || isPnlZero
      ? undefined
      : isPnlPositive
        ? 'text-success-default'
        : 'text-error-default';

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
  const headlineValue = formatPositionHeadlineValue(
    isClosed,
    isPerp,
    position.currentValueUSD,
    perpPnlValue,
    position.realizedPnl,
  );
  const topRight = isClosed ? (
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      twClassName={pnlColorClass}
      color={pnlColorClass ? undefined : TextColor.TextAlternative}
    >
      {headlineValue}
    </Text>
  ) : (
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextDefault}
    >
      {headlineValue}
    </Text>
  );

  // All positions — open and closed, perp and spot — render the PnL direction
  // as a signed percentage, colored by profit/loss direction.
  const signedDisplayPnlPercent =
    hasPnlPercent && pnlSignSource != null && !isPnlZero
      ? Math.abs(displayPnlPercent) * (isPnlPositive ? 1 : -1)
      : displayPnlPercent;
  const subtitle =
    isClosed || showTradeDate
      ? formatTradeDate(position.lastTradeAt)
      : `${formatTokenAmount(
          isPerp
            ? Math.abs(
                position.positionAmountWithLeverage ?? position.positionAmount,
              )
            : position.positionAmount,
        )} ${displaySymbol}`;
  const flagLabel = flagLabelKey ? strings(flagLabelKey) : null;
  const subtitleText =
    isSublineFlag && flagLabel ? `${subtitle} · ${flagLabel}` : subtitle;
  const accessibilityReasonKey = isSublineFlag
    ? getPositionFlagAccessibilityReasonKey(position)
    : null;
  const pnlDirection = getFlaggedPositionPnlDirection(
    hasPnlPercent,
    isPnlZero,
    isPnlPositive,
  );
  const accessibilityLabel =
    accessibilityReasonKey != null
      ? formatFlaggedPositionAccessibilityLabel({
          symbol: displaySymbol,
          value: headlineValue,
          direction: pnlDirection,
          percent:
            pnlDirection == null
              ? null
              : formatPercent(Math.abs(displayPnlPercent ?? 0), {
                  showSign: false,
                }),
          reasonKey: accessibilityReasonKey,
        })
      : undefined;
  const bottomRight = (
    <Text
      variant={TextVariant.BodySm}
      twClassName={pnlColorClass}
      color={pnlColorClass ? undefined : TextColor.TextAlternative}
    >
      {formatPercent(signedDisplayPnlPercent)}
    </Text>
  );

  const content = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName={isExcluded ? 'px-4 py-3 opacity-50' : 'px-4 py-3'}
      testID={isPressable ? undefined : testID}
      accessible={!isPressable && accessibilityLabel != null}
      accessibilityLabel={isPressable ? undefined : accessibilityLabel}
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
            testID={`position-row-subtitle-${position.tokenSymbol}`}
          >
            {subtitleText}
          </Text>
          {isExcluded && flagLabel ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              numberOfLines={1}
              testID={`position-row-flag-label-${position.tokenSymbol}`}
            >
              {flagLabel}
            </Text>
          ) : null}
        </Box>
      </Box>

      <Box alignItems={BoxAlignItems.End}>
        {topRight}
        {bottomRight}
      </Box>
    </Box>
  );

  if (isPressable) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const PositionRow = React.memo(PositionRowComponent);

export default PositionRow;
