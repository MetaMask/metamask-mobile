import MaskedView from '@react-native-masked-view/masked-view';
import {
  Box,
  ButtonBase,
  ButtonBaseSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useHaptics } from '../../../../../util/haptics';

export const GLOW_TOTAL_MS = 750;
const GLOW_SWEEP_MS = 700;
const GLOW_FADE_MS = 120;
const GLOW_HOLD_MS = GLOW_TOTAL_MS - GLOW_FADE_MS * 2;
const BORDER_WIDTH = 1.5;

// CSS 105deg translated to react-native-linear-gradient coordinates.
const SHIMMER_START = { x: 0, y: 0.37 };
const SHIMMER_END = { x: 1, y: 0.63 };
const SHIMMER_LOCATIONS = [0.3, 0.45, 0.55, 0.7];
const PRO_GRADIENT_LOCATIONS = [0, 0.203, 0.406, 0.609, 0.812];

// Figma TAT-2536 ModeSwitchPill gradient tokens are not shared tokens yet.
/* eslint-disable @metamask/design-tokens/color-no-hex */
const SHIMMER_COLORS = ['transparent', '#DDC598', '#D99D2C', 'transparent'];
const PRO_GRADIENT_COLORS = [
  '#D99D2C',
  '#DDC598',
  '#D99D2C',
  '#DDC598',
  '#D99D2C',
];
const LITE_LABEL_COLOR = '#9b9b9b';
const BORDER_COLOR = '#858b9a33';
/* eslint-enable @metamask/design-tokens/color-no-hex */

const styles = StyleSheet.create({
  // Colors are fixed by the ModeSwitchPill Figma spec and are not tokens.
  /* eslint-disable @metamask/design-tokens/color-no-hex, react-native/no-color-literals */
  label: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    color: LITE_LABEL_COLOR,
  },
  maskLabel: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    color: '#ffffff',
  },
  /* eslint-enable @metamask/design-tokens/color-no-hex, react-native/no-color-literals */
  transparentLabel: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    opacity: 0,
  },
});

interface ModeLabelProps {
  children: string;
  isPro: boolean;
  isMask?: boolean;
}

const ModeLabel = ({ children, isPro, isMask = false }: ModeLabelProps) => {
  const text = (
    <Text style={isMask ? styles.maskLabel : styles.label}>{children}</Text>
  );

  if (!isPro || isMask) {
    return text;
  }

  return (
    <MaskedView maskElement={text}>
      <LinearGradient
        colors={PRO_GRADIENT_COLORS}
        locations={PRO_GRADIENT_LOCATIONS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.transparentLabel}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
};

interface PerpsModeSwitchPillProps {
  currentModeLabel: string;
  isPro: boolean;
  onSwitchRequest: () => void;
  enableHaptics?: boolean;
  accessibilityLabel: string;
  accessibilityHint: string;
  testID: string;
}

const PerpsModeSwitchPill = ({
  currentModeLabel,
  isPro,
  onSwitchRequest,
  enableHaptics = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: PerpsModeSwitchPillProps) => {
  const tw = useTailwind();
  const { playSelection } = useHaptics();
  const [width, setWidth] = useState(0);
  const [isShimmering, setIsShimmering] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sweepProgress = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(sweepProgress.value, [0, 1], [-2 * width, 0]),
      },
    ],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const handlePress = useCallback(() => {
    if (timerRef.current) {
      return;
    }

    if (enableHaptics) {
      playSelection().catch(() => undefined);
    }

    setIsShimmering(true);
    sweepProgress.value = 0;
    overlayOpacity.value = 0;
    sweepProgress.value = withTiming(1, {
      duration: GLOW_SWEEP_MS,
      easing: Easing.inOut(Easing.ease),
    });
    overlayOpacity.value = withSequence(
      withTiming(1, { duration: GLOW_FADE_MS }),
      withDelay(GLOW_HOLD_MS, withTiming(0, { duration: GLOW_FADE_MS })),
    );

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setIsShimmering(false);
      onSwitchRequest();
    }, GLOW_TOTAL_MS);
  }, [
    enableHaptics,
    onSwitchRequest,
    overlayOpacity,
    playSelection,
    sweepProgress,
  ]);

  const gradient = (
    <LinearGradient
      colors={SHIMMER_COLORS}
      locations={SHIMMER_LOCATIONS}
      start={SHIMMER_START}
      end={SHIMMER_END}
      style={tw.style('flex-1')}
    />
  );

  return (
    <Box
      accessible={false}
      twClassName="relative h-8"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <ButtonBase
        size={ButtonBaseSize.Sm}
        twClassName={(pressed) =>
          `h-8 rounded-lg border bg-default px-3 ${pressed ? 'bg-pressed' : ''}`
        }
        style={{ borderColor: BORDER_COLOR, borderWidth: BORDER_WIDTH }}
        onPress={handlePress}
        disabled={isShimmering}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        testID={testID}
      >
        <ModeLabel isPro={isPro}>{currentModeLabel}</ModeLabel>
      </ButtonBase>

      {isShimmering && width > 0 ? (
        <Animated.View
          accessible={false}
          pointerEvents="none"
          style={[
            tw.style('absolute inset-0 overflow-hidden rounded-lg'),
            overlayStyle,
          ]}
        >
          <Animated.View
            accessible={false}
            style={[
              tw.style('absolute bottom-0 top-0'),
              { width: width * 3 },
              sweepStyle,
            ]}
          >
            {gradient}
          </Animated.View>

          <Box
            accessible={false}
            twClassName="absolute bg-default"
            style={{
              top: BORDER_WIDTH,
              right: BORDER_WIDTH,
              bottom: BORDER_WIDTH,
              left: BORDER_WIDTH,
              borderRadius: 8 - BORDER_WIDTH,
            }}
          />

          <Box
            twClassName="absolute inset-0 items-center justify-center"
            accessible={false}
          >
            <ModeLabel isPro={isPro}>{currentModeLabel}</ModeLabel>
          </Box>

          <MaskedView
            accessible={false}
            style={tw.style('absolute inset-0')}
            maskElement={
              <Box
                accessible={false}
                twClassName="flex-1 items-center justify-center"
              >
                <ModeLabel isPro={isPro} isMask>
                  {currentModeLabel}
                </ModeLabel>
              </Box>
            }
          >
            <Animated.View
              accessible={false}
              style={[
                tw.style('absolute bottom-0 top-0'),
                { width: width * 3 },
                sweepStyle,
              ]}
            >
              {gradient}
            </Animated.View>
          </MaskedView>
        </Animated.View>
      ) : null}
    </Box>
  );
};

export default PerpsModeSwitchPill;
