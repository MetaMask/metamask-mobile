import React, { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  TouchableOpacity,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import musdAssetIcon from '../../../../../../images/musd-icon-2x.png';

export interface SpendAndEarnPromoCardProps {
  /**
   * Pre-formatted subline copy describing the benefit (e.g. "4% APY while you spend").
   */
  apySubline: string;
  onPress: () => void;
  /**
   * Optional accessibility label and testID override.
   */
  testID?: string;
  accessibilityLabel?: string;
}

const SHIMMER_WIDTH_FRACTION = 0.5;
const SHIMMER_SWEEP_DURATION_MS = 1500;
const SHIMMER_PAUSE_DURATION_MS = 1500;

const SHIMMER_GRADIENT_COLORS = [
  'rgba(255,255,255,0)',
  'rgba(255,255,255,0.18)',
  'rgba(255,255,255,0)',
] as const;
const SHIMMER_GRADIENT_START = { x: 0, y: 0.5 } as const;
const SHIMMER_GRADIENT_END = { x: 1, y: 0.5 } as const;

const styles = StyleSheet.create({
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  shimmerBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  shimmerGradient: {
    flex: 1,
  },
});

/**
 * Pressable promo card highlighting the Money account spend-and-earn benefit.
 *
 * Renders an mUSD icon, a 3-line copy stack ("Spend and earn" + APY subline +
 * "Tap to use Money account" hint) and a subtle horizontal shimmer that
 * sweeps across the card to draw the eye. The whole surface is tappable.
 */
const SpendAndEarnPromoCard: React.FC<SpendAndEarnPromoCardProps> = ({
  apySubline,
  onPress,
  testID = 'use-money-account-cta',
  accessibilityLabel,
}) => {
  const tw = useTailwind();
  const [cardWidth, setCardWidth] = useState(0);
  const translateX = useSharedValue(0);

  const shimmerWidth = cardWidth * SHIMMER_WIDTH_FRACTION;

  useEffect(() => {
    if (cardWidth === 0) return;

    translateX.value = -shimmerWidth;
    translateX.value = withRepeat(
      withSequence(
        withTiming(cardWidth, {
          duration: SHIMMER_SWEEP_DURATION_MS,
          easing: Easing.inOut(Easing.ease),
        }),
        withDelay(
          SHIMMER_PAUSE_DURATION_MS,
          withTiming(-shimmerWidth, { duration: 0 }),
        ),
      ),
      -1,
      false,
    );
  }, [cardWidth, shimmerWidth, translateX]);

  const animatedShimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width !== cardWidth) {
      setCardWidth(width);
    }
  };

  const resolvedAccessibilityLabel =
    accessibilityLabel ??
    strings('card.card_spending_limit.use_money_account_cta');

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={resolvedAccessibilityLabel}
      testID={testID}
      activeOpacity={0.85}
      style={tw.style('mb-6')}
    >
      <Box
        onLayout={handleLayout}
        twClassName="flex-row items-center gap-3 p-4 rounded-xl bg-background-muted overflow-hidden"
      >
        {cardWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[styles.shimmerOverlay]}
            testID={`${testID}-shimmer`}
          >
            <Animated.View
              style={[
                styles.shimmerBand,
                { width: shimmerWidth },
                animatedShimmerStyle,
              ]}
            >
              <LinearGradient
                colors={SHIMMER_GRADIENT_COLORS as unknown as string[]}
                start={SHIMMER_GRADIENT_START}
                end={SHIMMER_GRADIENT_END}
                style={styles.shimmerGradient}
              />
            </Animated.View>
          </Animated.View>
        )}

        <Image
          source={musdAssetIcon}
          style={tw.style('w-10 h-10 rounded-full')}
          resizeMode="contain"
        />
        <Box twClassName="flex-1">
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-text-default font-medium"
          >
            {strings('card.card_spending_limit.spend_and_earn_title')}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-text-alternative"
          >
            {apySubline}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-success-default font-medium mt-1"
          >
            {strings('card.card_spending_limit.spend_and_earn_action_hint')}
          </Text>
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default SpendAndEarnPromoCard;
