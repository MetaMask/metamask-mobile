import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  BoxFlexDirection,
  ButtonBase,
  ButtonBaseSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  PerpsMode,
} from '@metamask/perps-controller';
import {
  StyleSheet,
  TouchableOpacity,
  type LayoutRectangle,
} from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useTheme } from '../../../../../util/theme';
import { PerpsModeToggleSelectorsIDs } from '../../Perps.testIds';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { type PerpsModeToggleProps } from './PerpsModeToggle.types';
import PerpsProGradientLabel from './PerpsProGradientLabel';

/**
 * Selected "Pro" segment fill from Figma — `accent/02/normal` at ~18% over
 * `background/default`. Figma still only exposes accent/02 light/normal/dark;
 * no shared selected-fill token exists yet (TAT-3640).
 */
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
export const PERPS_PRO_ACCENT_SELECTED_BG = '#382b43';

/**
 * Mirrors QuickBuy Buy/Sell toggle feel (and Figma "Quick tab transition"
 * annotation on the Lite/Pro SegmentedControl): snappy, lightly-damped slide.
 */
const SLIDE_SPRING_CONFIG = {
  duration: 150,
  dampingRatio: 0.75,
} as const;

const styles = StyleSheet.create({
  // Inner row owns the relative positioning context so the absolute slider's
  // insets line up 1:1 with the segments' measured frames.
  row: {
    position: 'relative',
  },
  fullWidthRow: {
    position: 'relative',
    flex: 1,
  },
  slider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    // Matches the segments' rounded-lg (8px) so the fill tucks behind them.
    borderRadius: 8,
  },
  fullWidthSegment: {
    flex: 1,
  },
});

interface AnimatedModeToggleProps {
  mode: PerpsMode;
  onChange: (value: string) => void;
  liteLabel: string;
  proGradientLabel: React.ReactNode;
  liteSelectedColor: string;
  isFullWidth: boolean;
  testID: string;
}

/**
 * Two-segment Lite/Pro pill with a sliding selected fill (TAT-3640).
 *
 * Layout measurement + spring slide follow the QuickBuy trade-mode toggle so
 * the indicator tucks behind the segment labels without a full-screen flash.
 */
const AnimatedModeToggle: React.FC<AnimatedModeToggleProps> = ({
  mode,
  onChange,
  liteLabel,
  proGradientLabel,
  liteSelectedColor,
  isFullWidth,
  testID,
}) => {
  const slideProgress = useSharedValue(mode === PerpsMode.Pro ? 1 : 0);
  const liteWidthSV = useSharedValue(0);
  const liteXSV = useSharedValue(0);
  const proWidthSV = useSharedValue(0);

  const prevModeRef = useRef<PerpsMode | null>(null);
  const [liteLayout, setLiteLayout] = useState<LayoutRectangle | null>(null);
  const [proWidth, setProWidth] = useState(0);

  useEffect(() => {
    if (!liteLayout) {
      return;
    }
    const target = mode === PerpsMode.Lite ? 0 : 1;

    if (prevModeRef.current === null) {
      slideProgress.value = target;
      prevModeRef.current = mode;
      return;
    }

    if (prevModeRef.current !== mode) {
      prevModeRef.current = mode;
      slideProgress.value = withSpring(target, SLIDE_SPRING_CONFIG);
    }
  }, [mode, liteLayout, slideProgress]);

  const sliderStyle = useAnimatedStyle(() => {
    const progress = slideProgress.value;
    const width = interpolate(
      progress,
      [0, 1],
      [liteWidthSV.value, proWidthSV.value],
    );

    return {
      left: liteXSV.value,
      width,
      backgroundColor: interpolateColor(
        progress,
        [0, 1],
        [liteSelectedColor, PERPS_PRO_ACCENT_SELECTED_BG],
      ),
      transform: [{ translateX: progress * liteWidthSV.value }],
    };
  }, [liteSelectedColor]);

  const sliderWidth =
    mode === PerpsMode.Lite ? (liteLayout?.width ?? 0) : proWidth;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName={`${isFullWidth ? 'self-stretch' : 'self-start'} border border-muted rounded-xl p-1`}
      accessibilityRole="tablist"
      testID={testID}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        style={isFullWidth ? styles.fullWidthRow : styles.row}
      >
        {liteLayout && sliderWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            testID={PerpsModeToggleSelectorsIDs.SLIDER}
            style={[styles.slider, sliderStyle]}
          />
        )}

        <TouchableOpacity
          onPress={() => onChange(PerpsMode.Lite)}
          onLayout={(e) => {
            const layout = e.nativeEvent.layout;
            setLiteLayout(layout);
            liteWidthSV.value = layout.width;
            liteXSV.value = layout.x;
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === PerpsMode.Lite }}
          testID={PerpsModeToggleSelectorsIDs.LITE_SEGMENT}
          style={isFullWidth ? styles.fullWidthSegment : undefined}
        >
          <Box
            twClassName={`rounded-lg px-3 py-1 items-center ${isFullWidth ? 'w-full' : ''}`}
          >
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={
                mode === PerpsMode.Lite
                  ? TextColor.TextDefault
                  : TextColor.TextAlternative
              }
            >
              {liteLabel}
            </Text>
          </Box>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onChange(PerpsMode.Pro)}
          onLayout={(e) => {
            const width = e.nativeEvent.layout.width;
            setProWidth(width);
            proWidthSV.value = width;
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === PerpsMode.Pro }}
          testID={PerpsModeToggleSelectorsIDs.PRO_SEGMENT}
          style={isFullWidth ? styles.fullWidthSegment : undefined}
        >
          <Box
            twClassName={`rounded-lg px-3 py-1 items-center ${isFullWidth ? 'w-full' : ''}`}
          >
            {proGradientLabel}
          </Box>
        </TouchableOpacity>
      </Box>
    </Box>
  );
};

/**
 * Reusable Lite ⇄ Pro mode toggle for Perps entry points (TAT-3551 / TAT-3640).
 *
 * Rendered as a two-segment pill with a sliding selected fill (matching the
 * Replit prototype / QuickBuy trade-mode toggle animation). A single component
 * powers every entry point:
 * - Trade bottom-sheet menu (Perps row)
 * - Perps home header
 * - Market header (`variant="active"` shows only the active mode)
 */
const PerpsModeToggle: React.FC<PerpsModeToggleProps> = ({
  mode,
  onChange,
  variant = 'toggle',
  isFullWidth = false,
  source,
  testID = PerpsModeToggleSelectorsIDs.CONTAINER,
}) => {
  const { track } = usePerpsEventTracking();
  const { colors } = useTheme();
  const liteSelectedColor = colors.background.muted;

  const handleChange = useCallback(
    (value: string) => {
      const nextMode = value as PerpsMode;
      if (nextMode === mode) {
        return;
      }

      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_EVENT_PROPERTY.MODE]: nextMode,
        ...(source ? { [PERPS_EVENT_PROPERTY.SOURCE]: source } : {}),
      });

      onChange?.(nextMode);
    },
    [mode, onChange, source, track],
  );

  const liteLabel = strings('perps.mode.lite');
  const proLabel = strings('perps.mode.pro');
  const proGradientLabel = (
    <PerpsProGradientLabel>{proLabel}</PerpsProGradientLabel>
  );

  // Market header: single outlined pill showing only the active mode, per Figma
  // (transparent fill, `border/muted` border, gradient "Pro" text). Pressing it
  // flips to the opposite mode (same analytics + onChange path as the full
  // toggle).
  if (variant === 'active') {
    const isPro = mode === PerpsMode.Pro;
    const nextModeLabel = isPro ? liteLabel : proLabel;
    const currentModeLabel = isPro ? proLabel : liteLabel;
    return (
      <ButtonBase
        size={ButtonBaseSize.Sm}
        twClassName="bg-transparent border border-border-muted"
        onPress={() => handleChange(isPro ? PerpsMode.Lite : PerpsMode.Pro)}
        accessibilityLabel={strings(
          'perps.mode.active_pill_accessibility_label',
          { mode: currentModeLabel },
        )}
        accessibilityHint={strings(
          'perps.mode.active_pill_accessibility_hint',
          { mode: nextModeLabel },
        )}
        testID={
          isPro
            ? PerpsModeToggleSelectorsIDs.PRO_SEGMENT
            : PerpsModeToggleSelectorsIDs.LITE_SEGMENT
        }
      >
        {isPro ? proGradientLabel : liteLabel}
      </ButtonBase>
    );
  }

  return (
    <AnimatedModeToggle
      mode={mode}
      onChange={handleChange}
      liteLabel={liteLabel}
      proGradientLabel={proGradientLabel}
      liteSelectedColor={liteSelectedColor}
      isFullWidth={isFullWidth}
      testID={testID}
    />
  );
};

export default PerpsModeToggle;
