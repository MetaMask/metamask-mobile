import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  Box,
  Button,
  ButtonBaseSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { getMinutesUntilNextDeck } from '../../utils/exploreCardsSession';
import { EMPTY_CARD_ACCENT } from '../../constants';
import AnimatedGradientBorder from '../AnimatedGradientBorder';

const FLOAT_DURATION_MS = 1800;
const FLOAT_AMPLITUDE_PT = 5;
const TWINKLE_DURATION_MS = 1400;

export interface EmptyStateCardProps {
  /** True once the card is the front of the stack (deck exhausted). */
  isTop: boolean;
  /** Deals a fresh deck so the user can keep swiping right away. */
  onRestart: () => void;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

/** A looping twinkle (opacity + scale + wiggle) used as celebratory décor. */
const Twinkle: React.FC<{ delayMs: number; size?: IconSize }> = ({
  delayMs,
  size = IconSize.Md,
}) => {
  const twinkle = useSharedValue(0);

  useEffect(() => {
    twinkle.value = withDelay(
      delayMs,
      withRepeat(withTiming(1, { duration: TWINKLE_DURATION_MS }), -1, true),
    );
  }, [twinkle, delayMs]);

  const twinkleStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + 0.75 * twinkle.value,
    transform: [
      { scale: 0.75 + 0.45 * twinkle.value },
      { rotate: `${twinkle.value * 30 - 15}deg` },
    ],
  }));

  return (
    <Animated.View style={twinkleStyle}>
      <Icon
        name={IconName.Sparkle}
        size={size}
        color={IconColor.WarningDefault}
      />
    </Animated.View>
  );
};

/**
 * The permanent last "card" of the deck. Lives behind everything and gets
 * promoted like any other card; plays a one-shot scale-pulse flourish when it
 * reaches the front, floats its badge, twinkles a few sparkles, and ticks a
 * live countdown to the next hourly deck. The primary CTA deals a new deck
 * immediately.
 */
const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  isTop,
  onRestart,
}) => {
  const navigation = useNavigation();
  const [minutesLeft, setMinutesLeft] = useState(getMinutesUntilNextDeck);
  const pulse = useSharedValue(1);
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(
      withTiming(1, {
        duration: FLOAT_DURATION_MS,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [float]);

  useEffect(() => {
    if (!isTop) return;
    pulse.value = withSequence(
      withTiming(1.04, { duration: 180 }),
      withTiming(1, { duration: 220 }),
    );
    const interval = setInterval(
      () => setMinutesLeft(getMinutesUntilNextDeck()),
      60_000,
    );
    return () => clearInterval(interval);
  }, [isTop, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (float.value * 2 - 1) * -FLOAT_AMPLITUDE_PT }],
  }));

  return (
    <Animated.View style={[styles.fill, pulseStyle]}>
      <AnimatedGradientBorder colors={EMPTY_CARD_ACCENT}>
        <Box twClassName="flex-1 p-5">
          <Box twClassName="flex-1 items-center justify-center gap-3">
            <Box twClassName="absolute top-4 left-6">
              <Twinkle delayMs={0} />
            </Box>
            <Box twClassName="absolute top-10 right-8">
              <Twinkle delayMs={450} size={IconSize.Sm} />
            </Box>
            <Box twClassName="absolute bottom-8 left-10">
              <Twinkle delayMs={900} size={IconSize.Sm} />
            </Box>
            <Animated.View style={floatStyle}>
              <Box twClassName="w-16 h-16 rounded-full bg-success-muted items-center justify-center">
                <Icon
                  name={IconName.Confirmation}
                  size={IconSize.Xl}
                  color={IconColor.SuccessDefault}
                />
              </Box>
            </Animated.View>
            <Text
              variant={TextVariant.HeadingMd}
              fontWeight={FontWeight.Bold}
              twClassName="text-center mt-2"
            >
              {strings('explore_cards.empty_title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="text-center"
            >
              {strings('explore_cards.empty_body')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="text-center"
            >
              {strings('explore_cards.empty_countdown', {
                minutes: minutesLeft,
              })}
            </Text>
          </Box>
          <Box twClassName="mt-4 gap-3">
            <Button size={ButtonBaseSize.Lg} isFullWidth onPress={onRestart}>
              {strings('explore_cards.empty_restart')}
            </Button>
            <Button
              size={ButtonBaseSize.Lg}
              isFullWidth
              variant={ButtonVariant.Secondary}
              onPress={() => navigation.goBack()}
            >
              {strings('explore_cards.empty_back')}
            </Button>
          </Box>
        </Box>
      </AnimatedGradientBorder>
    </Animated.View>
  );
};

export default EmptyStateCard;
