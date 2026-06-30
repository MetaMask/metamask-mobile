import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Trade } from '@metamask/social-controllers';
import { strings } from '../../../../../../locales/i18n';
import { ImpactMoment, playImpact } from '../../../../../util/haptics';
import { formatUsd, formatTradeTime } from '../../utils/formatters';
import PerpBadges from '../../components/PerpBadges';
import { getPerpTradeDirection, isPerpTrade } from '../../utils/perp';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TraderAvatar from '../../../Homepage/Sections/TopTraders/components/TraderAvatar';

const AVATAR_SIZE = 32;
/** How long the highlight lingers before fading out, ms. */
const EMPHASIS_FADE_MS = 1600;

export interface TradeRowProps {
  trade: Trade;
  traderImageUrl?: string;
  traderAddress?: string;
  /** When provided, the row is tappable (e.g. to focus the chart on this trade). */
  onPress?: (trade: Trade) => void;
  /**
   * When true, the row briefly flashes a highlight — used by the reverse
   * interaction (tapping a circle on the chart emphasizes its trade row).
   */
  isEmphasized?: boolean;
}

const TradeRow: React.FC<TradeRowProps> = ({
  trade,
  traderImageUrl,
  traderAddress,
  onPress,
  isEmphasized = false,
}) => {
  const tw = useTailwind();
  // Highlight overlay fades from fully-tinted to transparent when emphasized.
  const highlight = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isEmphasized) return;
    highlight.setValue(1);
    const animation = Animated.timing(highlight, {
      toValue: 0,
      duration: EMPHASIS_FADE_MS,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [isEmphasized, highlight]);

  const isEntry = trade.intent === 'enter';
  const isPerp = isPerpTrade(trade);
  const perpDirection = getPerpTradeDirection(trade);

  // Perp fills read as "opened"/"closed" (vs spot "bought"/"sold").
  const actionLabel = isPerp
    ? isEntry
      ? strings('social_leaderboard.trader_position.opened')
      : strings('social_leaderboard.trader_position.closed_action')
    : isEntry
      ? strings('social_leaderboard.trader_position.bought')
      : strings('social_leaderboard.trader_position.sold');

  return (
    <Pressable
      onPress={
        onPress
          ? () => {
              playImpact(ImpactMoment.ChartCrosshair);
              onPress(trade);
            }
          : undefined
      }
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      testID={`trade-row-${trade.transactionHash}`}
      style={({ pressed }) =>
        pressed && onPress ? { opacity: 0.6 } : undefined
      }
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          tw.style('bg-primary-muted'),
          { opacity: highlight },
        ]}
      />
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="px-4 py-3"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={4}
          twClassName="flex-1 min-w-0 mr-3"
        >
          <TraderAvatar
            imageUrl={traderImageUrl}
            address={traderAddress}
            size={AVATAR_SIZE}
          />
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
                {actionLabel}
              </Text>
              {perpDirection ? (
                <PerpBadges
                  direction={perpDirection}
                  leverage={trade.perpLeverage}
                  testID={`trade-row-perp-badges-${trade.transactionHash}`}
                />
              ) : null}
            </Box>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {formatTradeTime(trade.timestamp)}
            </Text>
          </Box>
        </Box>

        <Box alignItems={BoxAlignItems.End}>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName={
              isEntry ? 'text-success-default' : 'text-error-default'
            }
          >
            {formatUsd(
              isEntry ? Math.abs(trade.usdCost) : -Math.abs(trade.usdCost),
            )}
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
};

export default TradeRow;
