import MaskedView from '@react-native-masked-view/masked-view';
import {
  Box,
  ButtonBase,
  ButtonBaseSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import {
  getPerpsProPillBorderGradientColors,
  getPerpsProPillGradientColors,
  getPerpsProPillShimmerColors,
  PRO_PILL_BORDER_GRADIENT_END,
  PRO_PILL_BORDER_GRADIENT_LOCATIONS,
  PRO_PILL_BORDER_GRADIENT_START,
} from '../../constants/perpsModeColors';
import { ImpactMoment, useHaptics } from '../../../../../util/haptics';
import CapsuleGlass from '../../../../../component-library/components-temp/CapsuleGlass';

export const GLOW_TOTAL_MS = 680;
const GLOW_SWEEP_MS = 630;
const GLOW_FADE_MS = 120;
const GLOW_HOLD_MS = GLOW_TOTAL_MS - GLOW_FADE_MS * 2;
// Lite uses glass borders; Pro draws a hairline gold gradient outline.
export const PRO_BORDER_WIDTH = 0.65;

// Holds one width across the Lite/Pro label swap; CJK labels can still exceed it.
const MIN_WIDTH = 56;

// CSS 105deg translated to react-native-linear-gradient coordinates.
const SHIMMER_START = { x: 0, y: 0.37 };
const SHIMMER_END = { x: 1, y: 0.63 };
const SHIMMER_LOCATIONS = [0.3, 0.45, 0.55, 0.7];
const PRO_GRADIENT_LOCATIONS = [0, 0.203, 0.406, 0.609, 0.812];

const styles = StyleSheet.create({
  // Colors are fixed by the ModeSwitchPill Figma spec and are not tokens.
  /* eslint-disable @metamask/design-tokens/color-no-hex, react-native/no-color-literals */
  label: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
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

const useIsDarkTheme = () => {
  const { themeAppearance } = useTheme();
  return themeAppearance === AppThemeKey.dark;
};

interface ModeLabelProps {
  children: string;
  isPro: boolean;
  isMask?: boolean;
}

const ModeLabel = ({ children, isPro, isMask = false }: ModeLabelProps) => {
  const tw = useTailwind();
  const isDark = useIsDarkTheme();
  const gradientColors = useMemo(
    () => getPerpsProPillGradientColors(isDark),
    [isDark],
  );
  // `text-default` keeps the Lite label legible in both themes; for Pro this
  // Text is only ever the MaskedView mask, where the gradient supplies the color.
  const text = (
    <Text
      style={
        isMask ? styles.maskLabel : [styles.label, tw.style('text-default')]
      }
    >
      {children}
    </Text>
  );

  if (!isPro || isMask) {
    return text;
  }

  return (
    <MaskedView maskElement={text}>
      <LinearGradient
        colors={gradientColors}
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
  onSwitchRequest: () => void | Promise<boolean | void>;
  enableHaptics?: boolean;
  accessibilityLabel: string;
  accessibilityHint: string;
  testID: string;
  isCapsule?: boolean;
}

const PerpsModeSwitchPill = ({
  currentModeLabel,
  isPro,
  onSwitchRequest,
  enableHaptics = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  isCapsule = false,
}: PerpsModeSwitchPillProps) => {
  const tw = useTailwind();
  const isDark = useIsDarkTheme();
  const { playImpact } = useHaptics();
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const width = frame.width;
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

  const shimmerColors = useMemo(
    () => getPerpsProPillShimmerColors(isDark),
    [isDark],
  );
  const handleModeSwitch = useCallback(() => {
    Promise.resolve(onSwitchRequest())
      .then((applied) => {
        if (applied !== false && enableHaptics) {
          playImpact(ImpactMoment.TabChange).catch(() => undefined);
        }
      })
      .catch(() => undefined);
  }, [enableHaptics, onSwitchRequest, playImpact]);

  const handlePress = useCallback(() => {
    if (timerRef.current) {
      return;
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
    }, GLOW_TOTAL_MS);

    handleModeSwitch();
  }, [handleModeSwitch, overlayOpacity, sweepProgress]);

  // Lite draws no outline. Pro's gold is an SVG stroke so the glass shows
  // through the pill; a view border can only be a flat color.
  const borderWidth = isPro ? PRO_BORDER_WIDTH : 0;
  const borderStyle = { borderWidth: 0 };
  const borderGradientColors = useMemo(
    () => getPerpsProPillBorderGradientColors(isDark),
    [isDark],
  );
  const borderGradientId = `${testID}-border-gradient`;
  const pillBorderRadius = (tw.style('rounded-full') as ViewStyle).borderRadius;
  const innerBorderRadius =
    typeof pillBorderRadius === 'number'
      ? Math.max(0, pillBorderRadius - borderWidth)
      : pillBorderRadius;

  const button = (
    <ButtonBase
      size={ButtonBaseSize.Sm}
      twClassName={(pressed) =>
        isCapsule
          ? 'h-10 rounded-full bg-transparent px-3'
          : `h-8 rounded-full border bg-default px-3 ${pressed ? 'bg-pressed' : ''}`
      }
      style={[borderStyle, { minWidth: MIN_WIDTH }]}
      onPress={handlePress}
      disabled={isShimmering}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      testID={testID}
    >
      <ModeLabel isPro={isPro}>{currentModeLabel}</ModeLabel>
    </ButtonBase>
  );

  // The sweep is identical in both directions — only the palette is theme-aware.
  const gradient = (
    <LinearGradient
      colors={shimmerColors}
      locations={SHIMMER_LOCATIONS}
      start={SHIMMER_START}
      end={SHIMMER_END}
      style={tw.style('flex-1')}
    />
  );

  return (
    <Box
      accessible={false}
      twClassName={isCapsule ? 'relative h-10' : 'relative h-8'}
      onLayout={(event) =>
        setFrame({
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        })
      }
      testID={`${testID}-shell`}
    >
      {isCapsule ? (
        <CapsuleGlass nonGlassClassName="border-0" testID={`${testID}-capsule`}>
          {button}
        </CapsuleGlass>
      ) : (
        button
      )}

      {isPro && frame.width > 0 && frame.height > 0 ? (
        <Svg
          pointerEvents="none"
          style={tw.style('absolute inset-0')}
          testID={`${testID}-border`}
        >
          <Defs>
            <SvgLinearGradient
              id={borderGradientId}
              x1={PRO_PILL_BORDER_GRADIENT_START.x}
              y1={PRO_PILL_BORDER_GRADIENT_START.y}
              x2={PRO_PILL_BORDER_GRADIENT_END.x}
              y2={PRO_PILL_BORDER_GRADIENT_END.y}
            >
              {borderGradientColors.map((color, index) => (
                <Stop
                  key={`${color}-${PRO_PILL_BORDER_GRADIENT_LOCATIONS[index]}`}
                  offset={PRO_PILL_BORDER_GRADIENT_LOCATIONS[index]}
                  stopColor={color}
                />
              ))}
            </SvgLinearGradient>
          </Defs>
          <Rect
            x={borderWidth / 2}
            y={borderWidth / 2}
            width={frame.width - borderWidth}
            height={frame.height - borderWidth}
            rx={frame.height / 2}
            fill="none"
            stroke={`url(#${borderGradientId})`}
            strokeWidth={borderWidth}
          />
        </Svg>
      ) : null}

      {isShimmering && width > 0 ? (
        <Animated.View
          accessible={false}
          pointerEvents="none"
          style={[
            tw.style('absolute inset-0 overflow-hidden rounded-full'),
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

          {/* Masks the sweep to the outline; on glass it sweeps the whole capsule. */}
          {!isCapsule && (
            <Box
              accessible={false}
              twClassName="absolute bg-default"
              style={{
                top: borderWidth,
                right: borderWidth,
                bottom: borderWidth,
                left: borderWidth,
                borderRadius: innerBorderRadius,
              }}
            />
          )}

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
