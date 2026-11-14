import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { BLUR_INTENSITY } from '../../../../component-library/hooks/useBlurMaterial';
import { useLiquidGlass } from '../../../../component-library/hooks/useLiquidGlass';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { playSelection } from '../../../../util/haptics';
import { useTheme } from '../../../../util/theme';
import { FEED_REACTION_EMOJIS } from '../reactions';
import { ReactionPickerBalloonSelectorsIDs } from './ReactionPickerBalloon.testIds';

export interface ReactionPickerAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ReactionPickerBalloonProps {
  visible: boolean;
  anchor: ReactionPickerAnchor | null;
  onClose: () => void;
  onPick: (emotion: string) => void;
}

const BALLOON_HEIGHT = 52;
const BALLOON_GAP = 8;
const TRAY_EDGE = 16;
const TRAY_PADDING = 8;
const EMOJI_TARGET = 44;
const CALM_MS = 80;
const TRAY_EASING = Easing.out(Easing.cubic);
// Same spring as the footer plus menu. A fast start and a small settle make
// the pill pop out of the button.
const GROW_SPRING = {
  mass: 1,
  stiffness: 322,
  damping: 26,
  overshootClamping: false,
  energyThreshold: 0.001,
  reduceMotion: ReduceMotion.System,
};
const COLLAPSE_TIMING = {
  duration: 180,
  easing: Easing.in(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};
/** Emoji stay hidden until the pill has lifted off the finger. */
const EMOJI_FADE_START = 0.4;
const EMOJI_FADE_END = 0.8;
const CONTENT_FADE_OUT = {
  duration: 70,
  easing: Easing.in(Easing.quad),
  reduceMotion: ReduceMotion.Never,
};

export function emojiOpacityForProgress(progress: number): number {
  'worklet';
  if (progress <= EMOJI_FADE_START) {
    return 0;
  }
  if (progress >= EMOJI_FADE_END) {
    return 1;
  }
  return (progress - EMOJI_FADE_START) / (EMOJI_FADE_END - EMOJI_FADE_START);
}

/** Scrolling a row whose width is still changing fights the grow. */
const SCROLL_READY_PROGRESS = 0.98;

export interface TrayRect {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius: number;
}

/**
 * The button the tray grows out of, and the full-width rect it settles into
 * a gap above that button, or below it when the status bar leaves no room.
 * The radius starts as the button's circle and ends as the pill.
 */
export const getTrayRects = (
  anchor: ReactionPickerAnchor,
  windowWidth: number,
  minTop: number,
): { from: TrayRect; to: TrayRect; opensBelow: boolean } => {
  const aboveTop = anchor.y - BALLOON_HEIGHT - BALLOON_GAP;
  const opensBelow = aboveTop < minTop;

  return {
    from: {
      left: anchor.x,
      top: anchor.y,
      width: anchor.width,
      height: anchor.height,
      borderRadius: Math.min(anchor.width, anchor.height) / 2,
    },
    to: {
      left: TRAY_EDGE,
      top: opensBelow ? anchor.y + anchor.height + BALLOON_GAP : aboveTop,
      width: Math.max(120, windowWidth - TRAY_EDGE * 2),
      height: BALLOON_HEIGHT,
      borderRadius: BALLOON_HEIGHT / 2,
    },
    opensBelow,
  };
};
/** Darkens the glass and the older-iOS blur so emoji stay readable on a GIF. */
const TRAY_TINT_OPACITY = 0.8;

export const REACTION_TRAY_SURFACE_TEST_IDS = {
  GLASS: 'social-v1-reaction-picker-glass',
  BLUR: 'social-v1-reaction-picker-blur',
  PLAIN: 'social-v1-reaction-picker-plain',
  TINT: 'social-v1-reaction-picker-tint',
} as const;

const TrayTint: React.FC = () => {
  const tw = useTailwind();

  return (
    <View
      pointerEvents="none"
      testID={REACTION_TRAY_SURFACE_TEST_IDS.TINT}
      style={[
        StyleSheet.absoluteFill,
        tw.style('bg-background-elevated1'),
        { opacity: TRAY_TINT_OPACITY },
      ]}
    />
  );
};

/**
 * The tray material, on the same rule as the header capsules: Liquid Glass
 * where the OS draws it, the chrome blur on older iOS, and an opaque pill on
 * Android, low-end devices, and Reduce Transparency. The glass stays
 * non-interactive so swiping the row does not flex the pill.
 */
const TraySurface: React.FC<{
  material: ReturnType<typeof useLiquidGlass>;
}> = ({ material }) => {
  const tw = useTailwind();
  const { isGlassEnabled, glassColorScheme, isBlurEnabled, blurTint } =
    material;

  if (isGlassEnabled) {
    return (
      <>
        <GlassView
          glassEffectStyle="regular"
          colorScheme={glassColorScheme}
          isInteractive={false}
          testID={REACTION_TRAY_SURFACE_TEST_IDS.GLASS}
          style={StyleSheet.absoluteFill}
        />
        <TrayTint />
      </>
    );
  }

  if (isBlurEnabled) {
    return (
      <>
        <BlurView
          tint={blurTint}
          intensity={BLUR_INTENSITY}
          testID={REACTION_TRAY_SURFACE_TEST_IDS.BLUR}
          style={StyleSheet.absoluteFill}
        />
        <TrayTint />
      </>
    );
  }

  return (
    <View
      pointerEvents="none"
      testID={REACTION_TRAY_SURFACE_TEST_IDS.PLAIN}
      style={[StyleSheet.absoluteFill, tw.style('bg-background-elevated1')]}
    />
  );
};

const styles = StyleSheet.create({
  // UIKit draws glass with continuous corners; the clip and hairline match.
  trayShape: {
    borderCurve: 'continuous',
  },
  trayClip: {
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  // One line box the full height of the pill, so the glyph centers in the tray
  // instead of sitting on a text baseline inside a shorter box.
  emoji: {
    fontSize: 24,
    lineHeight: BALLOON_HEIGHT,
    height: BALLOON_HEIGHT,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  emojiTarget: {
    width: EMOJI_TARGET,
    height: BALLOON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

interface PickerEmojiProps {
  emotion: string;
  calmMotion: boolean;
  onPick: (emotion: string) => void;
}

const PickerEmoji: React.FC<PickerEmojiProps> = ({
  emotion,
  calmMotion,
  onPick,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = (): void => {
    playSelection().catch(() => undefined);
    if (!calmMotion) {
      scale.value = withSequence(
        withTiming(0.72, { duration: 80 }),
        withSpring(1, { damping: 11, stiffness: 280 }),
      );
    }
    onPick(emotion);
  };

  return (
    <Pressable
      accessibilityRole="button"
      testID={`${ReactionPickerBalloonSelectorsIDs.EMOJI}-${emotion}`}
      onPress={handlePress}
      style={styles.emojiTarget}
    >
      <Animated.View style={animatedStyle}>
        <Text style={styles.emoji}>{emotion}</Text>
      </Animated.View>
    </Pressable>
  );
};

const ReactionPickerTray: React.FC<
  ReactionPickerBalloonProps & { anchor: ReactionPickerAnchor }
> = ({ anchor, onClose, onPick }) => {
  const tw = useTailwind();
  const { shadows } = useTheme();
  const material = useLiquidGlass();
  const isOpaque = !material.isGlassEnabled && !material.isBlurEnabled;
  const { width: windowWidth } = useWindowDimensions();
  const prefersReducedMotion = useReducedMotion();
  // Local motion only. Network tier is not read: the tray does not fetch.
  // Unknown hardware keeps the grow. Only LOW, and Reduce Motion, fade in place.
  const calmMotion = prefersReducedMotion || getHardwareTier() === 'LOW';
  const { top: safeTop } = useSafeAreaInsets();
  const { from, to, opensBelow } = getTrayRects(
    anchor,
    windowWidth,
    safeTop + BALLOON_GAP,
  );
  // Glass is grown by its frame, never scaled: a scaled glass layer warps
  // its refraction and its corners wobble.
  const progress = useSharedValue(calmMotion ? 1 : 0);
  // The glass stays fully opaque. Fading it makes iOS drop the blur.
  // Reduced motion fades the whole pill in place instead of growing it.
  const pillOpacity = useSharedValue(calmMotion ? 0 : 1);
  const closeFade = useSharedValue(0);
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const [isClosing, setIsClosing] = useState(false);
  const [isReady, setIsReady] = useState(calmMotion);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (calmMotion) {
      pillOpacity.value = withTiming(1, {
        duration: CALM_MS,
        easing: TRAY_EASING,
      });
      return;
    }
    progress.value = withSpring(1, GROW_SPRING);
  }, [calmMotion, pillOpacity, progress]);

  useAnimatedReaction(
    () => progress.value >= SCROLL_READY_PROGRESS,
    (ready, wasReady) => {
      if (ready && !wasReady) {
        scheduleOnRN(setIsReady, true);
      }
    },
  );

  const shapeStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      borderRadius:
        from.borderRadius + (to.borderRadius - from.borderRadius) * p,
    };
  });

  const trayStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: pillOpacity.value,
      left: from.left + (to.left - from.left) * p,
      top: from.top + (to.top - from.top) * p,
      width: from.width + (to.width - from.width) * p,
      height: from.height + (to.height - from.height) * p,
    };
  });

  // Emoji stay inside the pill, on the button edge. Their fade follows the
  // grow, so they appear only after the pill has cleared the finger.
  const contentStyle = useAnimatedStyle(() => ({
    opacity:
      emojiOpacityForProgress(progress.value) * (1 - closeFade.value),
  }));

  const finishClose = (): void => {
    onCloseRef.current();
  };

  const requestClose = (): void => {
    if (closingRef.current) {
      return;
    }
    closingRef.current = true;
    setIsClosing(true);

    if (calmMotion) {
      pillOpacity.value = withTiming(
        0,
        { duration: CALM_MS, easing: TRAY_EASING },
        (done) => {
          if (done) {
            scheduleOnRN(finishClose);
          }
        },
      );
      return;
    }

    closeFade.value = withTiming(1, CONTENT_FADE_OUT);
    progress.value = withTiming(0, COLLAPSE_TIMING, (done) => {
      if (done) {
        scheduleOnRN(finishClose);
      }
    });
  };

  const handlePick = (emotion: string): void => {
    if (closingRef.current) {
      return;
    }
    onPick(emotion);
    requestClose();
  };

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={requestClose}
    >
      <Pressable
        accessibilityRole="button"
        testID={ReactionPickerBalloonSelectorsIDs.SCRIM}
        onPress={requestClose}
        style={tw.style('absolute inset-0')}
      />
      <Animated.View
        testID={ReactionPickerBalloonSelectorsIDs.BALLOON}
        pointerEvents={isClosing || !isReady ? 'none' : 'auto'}
        style={[
          // Android only draws elevation from an opaque background.
          tw.style('absolute', isOpaque && 'bg-background-elevated1'),
          styles.trayShape,
          shadows.size.md,
          trayStyle,
          shapeStyle,
        ]}
      >
        <Animated.View
          style={[
            tw.style('flex-1 overflow-hidden border-muted'),
            styles.trayClip,
            shapeStyle,
          ]}
        >
          <TraySurface material={material} />
          <Animated.View
            testID={ReactionPickerBalloonSelectorsIDs.CONTENT}
            style={[
              tw.style('absolute left-0', opensBelow ? 'top-0' : 'bottom-0'),
              {
                width: to.width,
                height: to.height,
                paddingHorizontal: TRAY_PADDING,
              },
              contentStyle,
            ]}
          >
            <ScrollView
              horizontal
              nestedScrollEnabled
              scrollEnabled={isReady}
              bounces
              alwaysBounceHorizontal
              alwaysBounceVertical={false}
              decelerationRate="normal"
              overScrollMode="always"
              showsHorizontalScrollIndicator={false}
              testID={ReactionPickerBalloonSelectorsIDs.STRIP}
              style={tw.style('flex-1')}
              contentContainerStyle={tw.style('items-center')}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={1}
              >
                {FEED_REACTION_EMOJIS.map((emotion) => (
                  <PickerEmoji
                    key={emotion}
                    emotion={emotion}
                    calmMotion={calmMotion}
                    onPick={handlePick}
                  />
                ))}
              </Box>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const ReactionPickerBalloon: React.FC<ReactionPickerBalloonProps> = ({
  visible,
  anchor,
  onClose,
  onPick,
}) => {
  if (!visible || !anchor) {
    return null;
  }

  return (
    <ReactionPickerTray
      visible
      anchor={anchor}
      onClose={onClose}
      onPick={onPick}
    />
  );
};

export default ReactionPickerBalloon;
