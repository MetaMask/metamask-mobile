import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';

const PRESS_SPRING = { damping: 14, stiffness: 420, mass: 0.6 } as const;
const POP_SPRING = { damping: 9, stiffness: 320, mass: 0.5 } as const;
const REVEAL_SPRING = { damping: 14, stiffness: 560, mass: 0.4 } as const;
const SLASH_TIMING = {
  duration: 190,
  easing: Easing.out(Easing.cubic),
} as const;
/** Horizontal gap the chip reserves between itself and the Follow button. */
const CHIP_GAP = 8;
/** How far right of its resting slot the chip starts before sliding in. */
const ENTER_TRANSLATE_X = 16;
/** Scale the chip springs up from as it reveals. */
const ENTER_SCALE = 0.65;

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  slash: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
  },
});

export interface TraderMuteChipProps {
  /** Whether the trader's alerts are currently paused. */
  isMuted: boolean;
  /**
   * Whether the chip is shown. Driven by follow state: the chip springs open
   * (reserving layout width, so the sibling Follow button smoothly resizes) and
   * collapses back closed on unfollow. Defaults to true.
   */
  visible?: boolean;
  /** Fired after the tactile feedback when the chip is tapped. */
  onPress: () => void;
  /** Chip diameter in px. Defaults to 40 (profile). Use 32 for dense rows. */
  diameter?: number;
  /** Trader display name, woven into the accessibility label when available. */
  traderName?: string;
  testID?: string;
}

/**
 * A single-tap bell chip that flips a followed trader between "On" (receiving
 * alerts) and "Muted" (following, alerts paused).
 *
 * A single `reveal` spring (0 → 1) drives both the chip's own animated width
 * (so an adjacent flex button translates and resizes smoothly every frame,
 * never instantly) and the chip's slide-in + spring scale. Tapping adds a
 * press-down scale, a spring "pop", a small wiggle, and a diagonal slash that
 * strokes across the bell when muted. Tactile feedback fires when the mute
 * state actually toggles (see `toggleTraderNotification`), matching follow.
 */
const TraderMuteChip: React.FC<TraderMuteChipProps> = ({
  isMuted,
  visible = true,
  onPress,
  diameter = 40,
  traderName,
  testID,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  const pressScale = useSharedValue(1);
  const popScale = useSharedValue(1);
  const slash = useSharedValue(isMuted ? 1 : 0);
  const wiggle = useSharedValue(0);
  // 0 = fully collapsed/hidden, 1 = fully open. Drives layout width + reveal.
  const reveal = useSharedValue(visible ? 1 : 0);

  // Animate open/closed on follow-state changes, but settle instantly on the
  // first mount so an already-followed trader doesn't pop in on screen load.
  const hasRevealedRef = useRef(false);
  useEffect(() => {
    if (!hasRevealedRef.current) {
      hasRevealedRef.current = true;
      reveal.value = visible ? 1 : 0;
      return;
    }
    reveal.value = withSpring(visible ? 1 : 0, REVEAL_SPRING);
  }, [visible, reveal]);

  // Skip the flip animation on first mount; only animate genuine toggles so the
  // chip doesn't pop when the screen first renders an already-muted trader.
  const hasMountedRef = useRef(false);
  useEffect(() => {
    slash.value = withTiming(isMuted ? 1 : 0, SLASH_TIMING);
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    popScale.value = withSequence(
      withTiming(1.18, { duration: 110, easing: Easing.out(Easing.quad) }),
      withSpring(1, POP_SPRING),
    );
    wiggle.value = withSequence(
      withTiming(isMuted ? -1 : 1, { duration: 90 }),
      withSpring(0, POP_SPRING),
    );
  }, [isMuted, slash, popScale, wiggle]);

  const handlePressIn = useCallback(() => {
    pressScale.value = withTiming(0.88, { duration: 90 });
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, PRESS_SPRING);
  }, [pressScale]);

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  // Layout driver: the wrapper's width (and left gap) grow with `reveal`, so a
  // neighbouring flex button recomputes its width on every frame of the spring.
  const wrapperStyle = useAnimatedStyle(() => ({
    width: reveal.value * diameter,
    marginLeft: reveal.value * CHIP_GAP,
  }));

  // The bell itself is pinned to the wrapper's right edge and slides/scales in.
  const chipStyle = useAnimatedStyle(() => {
    const enter = reveal.value;
    return {
      opacity: enter,
      transform: [
        { translateX: (1 - enter) * ENTER_TRANSLATE_X },
        {
          scale:
            pressScale.value *
            popScale.value *
            (ENTER_SCALE + (1 - ENTER_SCALE) * enter),
        },
        { rotate: `${wiggle.value * 10}deg` },
      ],
    };
  });

  const slashStyle = useAnimatedStyle(() => ({
    opacity: slash.value,
    transform: [{ rotate: '-45deg' }, { scaleX: slash.value }],
  }));

  const iconSize = diameter >= 40 ? IconSize.Md : IconSize.Sm;
  const slashLength = diameter * 0.62;

  const accessibilityLabel = traderName
    ? strings(
        isMuted
          ? 'social_leaderboard.mute.muted_accessibility_label_named'
          : 'social_leaderboard.mute.on_accessibility_label_named',
        { traderName },
      )
    : strings(
        isMuted
          ? 'social_leaderboard.mute.muted_accessibility_label'
          : 'social_leaderboard.mute.on_accessibility_label',
      );

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[{ height: diameter }, wrapperStyle]}
    >
      <Animated.View
        style={[
          styles.anchor,
          { width: diameter, height: diameter },
          chipStyle,
        ]}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!visible}
          accessibilityRole="switch"
          accessibilityState={{ checked: !isMuted }}
          accessibilityLabel={accessibilityLabel}
          hitSlop={8}
          testID={testID}
          style={[
            tw.style('items-center justify-center rounded-full'),
            {
              width: diameter,
              height: diameter,
              backgroundColor: colors.background.muted,
            },
          ]}
        >
          <Icon
            name={IconName.Notification}
            size={iconSize}
            color={isMuted ? IconColor.IconMuted : IconColor.IconDefault}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.slash,
              {
                width: slashLength,
                backgroundColor: colors.icon.muted,
              },
              slashStyle,
            ]}
          />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

export default React.memo(TraderMuteChip);
