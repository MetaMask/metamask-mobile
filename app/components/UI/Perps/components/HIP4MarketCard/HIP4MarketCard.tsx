/**
 * HIP4MarketCard - Prediction market card for the Perps tab
 *
 * Displays an HIP-4 binary prediction market with:
 * - Market question as title
 * - YES/NO probability bars
 * - Volume and resolution date
 * - "PREDICTION" badge
 *
 * Follows design system guidelines: Box, Text, useTailwind.
 */
import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import PerpsBadge from '../PerpsBadge';
import type { HIP4MarketCardProps } from './HIP4MarketCard.types';
import { HIP4MarketStatus } from '../../types/hip4-types';

/**
 * Formats a probability (0-1) as a percentage string.
 */
const formatProbability = (price: number): string => {
  const pct = Math.round(price * 100);
  return `${pct}%`;
};

/**
 * Formats volume for display.
 */
const formatVolume = (volume: number): string => {
  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(1)}M`;
  }
  if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(1)}K`;
  }
  return `$${volume.toFixed(0)}`;
};

const HIP4MarketCard: React.FC<HIP4MarketCardProps> = ({
  market,
  onPress,
  testID,
}) => {
  const tw = useTailwind();

  const handlePress = useCallback(() => {
    onPress?.(market);
  }, [market, onPress]);

  // Get the first outcome's YES/NO sides
  const primaryOutcome = market.outcomes[0];
  const yesSide = useMemo(
    () => primaryOutcome?.sides.find((s) => s.name === 'YES'),
    [primaryOutcome],
  );
  const noSide = useMemo(
    () => primaryOutcome?.sides.find((s) => s.name === 'NO'),
    [primaryOutcome],
  );

  const yesPercentage = yesSide ? Math.round(yesSide.price * 100) : 50;

  const statusLabel = useMemo(() => {
    switch (market.status) {
      case HIP4MarketStatus.AUCTION:
        return 'Auction';
      case HIP4MarketStatus.RESOLVED:
        return 'Resolved';
      case HIP4MarketStatus.UPCOMING:
        return 'Upcoming';
      default:
        return null;
    }
  }, [market.status]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      testID={testID || `hip4-market-card-${market.id}`}
      activeOpacity={0.7}
    >
      <Box twClassName="rounded-2xl bg-default border border-muted p-4 mx-4 my-1">
        {/* Header: Badge + Status */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="mb-2"
        >
          <PerpsBadge type="prediction" />
          {statusLabel && (
            <Box twClassName="rounded-full bg-warning-muted px-2 py-0.5">
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.WarningDefault}
              >
                {statusLabel}
              </Text>
            </Box>
          )}
        </Box>

        {/* Title */}
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={2}
          twClassName="mb-3"
        >
          {market.title}
        </Text>

        {/* Probability Bar */}
        <Box twClassName="mb-3">
          {/* Bar visualization */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            twClassName="h-2 rounded-full overflow-hidden bg-muted"
          >
            <Box
              twClassName="bg-success-default rounded-l-full"
              style={tw.style(`w-[${yesPercentage}%]`)}
            />
            <Box twClassName="bg-error-default rounded-r-full flex-1" />
          </Box>

          {/* YES / NO labels with percentages */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            twClassName="mt-1"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-1"
            >
              <Box twClassName="w-2 h-2 rounded-full bg-success-default" />
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.SuccessDefault}
              >
                Yes {formatProbability(yesSide?.price ?? 0.5)}
              </Text>
            </Box>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-1"
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.ErrorDefault}
              >
                No {formatProbability(noSide?.price ?? 0.5)}
              </Text>
              <Box twClassName="w-2 h-2 rounded-full bg-error-default" />
            </Box>
          </Box>
        </Box>

        {/* Footer: Volume + End Date */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {formatVolume(market.volume24h)} vol
          </Text>
          {market.endDate && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              Ends {new Date(market.endDate).toLocaleDateString()}
            </Text>
          )}
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default HIP4MarketCard;
