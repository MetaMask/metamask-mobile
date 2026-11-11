import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text as RNText,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { colorWithOpacity } from '../../../../../util/colors';
import { useTheme } from '../../../../../util/theme';
import { formatCompactFiat } from '../../utils/statBarFormat';
import {
  getGraduationDisplayPercent,
  type GraduationProgressViewModel,
} from './graduationViewModel';
import { GraduationProgressSelectors } from './GraduationProgress.testIds';

const FUSE_HEIGHT = 3;
const FUSE_CAP_RADIUS = 1.5;
const COMET_SIZE = 12;
const COMET_INNER_SIZE = 6;
const SHEEN_WIDTH = 40;
const MOUNT_SLIDE_DP = 12;

const MOUNT_DURATION_MS = 900;
const SLIDE_DURATION_MS = 700;
const DELTA_DURATION_MS = 300;
const REDUCED_MOTION_SETTLE_MS = 200;
const COUNT_UP_MOUNT_DURATION_MS = 800;
const COUNT_UP_DELTA_DURATION_MS = 300;
const SHEEN_LOOP_MS = 2400;
const COMET_PULSE_MS = 800;
const MOUNT_EASING = Easing.bezier(0.2, 0.8, 0.2, 1);

/** At this percent the fill heats up and the comet glow starts pulsing. */
const HIGH_HEAT_PERCENT = 90;

const TABULAR_NUMS = { fontVariant: ['tabular-nums' as const] };

const styles = StyleSheet.create({
  fill: {
    borderTopRightRadius: FUSE_CAP_RADIUS,
    borderBottomRightRadius: FUSE_CAP_RADIUS,
    transformOrigin: 'left center',
  },
});

const FIAT_CURRENCY = 'usd';

/**
 * Interpolated into the locale templates so the translated string keeps a
 * movable `{{percent}}` for translators while the count-up can substitute a
 * live number without re-running the whole template per frame.
 */
const PERCENT_PLACEHOLDER = 'PERCENTPLACEHOLDER';

const formatUsd = (value: number): string =>
  formatCompactFiat(value, FIAT_CURRENCY) ?? '$0';

interface GraduationProgressProps {
  viewModel: GraduationProgressViewModel;
}

const getAccessibilityLabel = (
  viewModel: GraduationProgressViewModel,
): string => {
  const displayPercent = getGraduationDisplayPercent(viewModel.percent);
  if (viewModel.stage === 'bonding') {
    return strings('token_details_v1.graduation.bonding_accessibility', {
      percent: displayPercent,
      raised: formatUsd(viewModel.raisedUsd),
      remaining: formatUsd(viewModel.remainingUsd),
    });
  }
  return strings('token_details_v1.graduation.new_accessibility', {
    percent: displayPercent,
  });
};

/**
 * Variant B of the memecoin graduation progress: a 3 dp fuse line pinned to
 * the header surface's bottom edge, with a comet glow riding the lit end.
 * Mounts by sliding in from the left, percent deltas settle in 300 ms and a
 * sheen flows toward the comet every 2.4 s. All motion stops under reduced
 * motion.
 */
export const GraduationProgress = ({ viewModel }: GraduationProgressProps) => {
  const tw = useTailwind();
  const { colors, themeAppearance } = useTheme();
  const reduceMotion = useReducedMotion() ?? false;
  const { percent } = viewModel;
  const isHighHeat = percent >= HIGH_HEAT_PERCENT;

  const fill = useSharedValue(0);
  const slide = useSharedValue(-MOUNT_SLIDE_DP);
  const sheen = useSharedValue(-SHEEN_WIDTH);
  const cometOpacity = useSharedValue(1);
  const [barWidth, setBarWidth] = useState(0);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      if (reduceMotion) {
        fill.set(percent);
        slide.set(0);
        return;
      }
      fill.set(0);
      slide.set(-MOUNT_SLIDE_DP);
      fill.set(
        withTiming(percent, {
          duration: MOUNT_DURATION_MS,
          easing: MOUNT_EASING,
        }),
      );
      slide.set(
        withTiming(0, { duration: SLIDE_DURATION_MS, easing: MOUNT_EASING }),
      );
      return;
    }
    fill.set(
      withTiming(percent, {
        duration: reduceMotion ? REDUCED_MOTION_SETTLE_MS : DELTA_DURATION_MS,
      }),
    );
    return;
  }, [percent, reduceMotion, fill, slide]);

  useEffect(() => {
    if (reduceMotion || barWidth <= 0) {
      return;
    }
    const fillEnd = (barWidth * percent) / 100;
    sheen.set(-SHEEN_WIDTH);
    sheen.set(
      withRepeat(
        withSequence(
          withTiming(fillEnd, {
            duration: SHEEN_LOOP_MS,
            easing: Easing.linear,
          }),
          // The jump back happens while the band is clipped outside the fill,
          // so the loop reads as one continuous flow toward the comet.
          withTiming(-SHEEN_WIDTH, { duration: 0 }),
        ),
        -1,
      ),
    );
    return () => {
      cancelAnimation(sheen);
    };
  }, [percent, reduceMotion, barWidth, sheen]);

  useEffect(() => {
    if (reduceMotion || !isHighHeat) {
      cometOpacity.set(1);
      return;
    }
    cometOpacity.set(
      withRepeat(
        withTiming(0.5, {
          duration: COMET_PULSE_MS,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        true,
      ),
    );
    return () => {
      cancelAnimation(cometOpacity);
    };
  }, [isHighHeat, reduceMotion, cometOpacity]);

  const handleBarLayout = useCallback((event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  }, []);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fill.get() / 100 }, { translateX: slide.get() }],
  }));

  const sheenClipStyle = useAnimatedStyle(() => ({
    width: `${fill.get()}%`,
  }));

  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sheen.get() }],
  }));

  const cometStyle = useAnimatedStyle(() => ({
    left: `${fill.get()}%`,
    transform: [{ translateX: slide.get() }],
    opacity: cometOpacity.get(),
  }));

  const sheenTint =
    themeAppearance === 'dark'
      ? colors.success.default
      : colors.background.default;

  // A tinted track instead of a border token, following the stepper progress
  // bar: the unfilled path stays visible on glass in both themes.
  const trackColor = colorWithOpacity(colors.primary.default, 0.3);

  return (
    <Animated.View
      accessibilityLabel={getAccessibilityLabel(viewModel)}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: getGraduationDisplayPercent(percent),
      }}
      onLayout={handleBarLayout}
      pointerEvents="none"
      style={tw.style('absolute bottom-0 left-0 right-0 h-[3px]')}
      testID={GraduationProgressSelectors.BAR}
    >
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: trackColor }]}
        testID={GraduationProgressSelectors.TRACK}
      />
      {/* The fill keeps a static full-width layout and reveals the lit
       * portion with an animated scaleX: legacy-interop gradients paint only
       * their mount-time frame, so an animated layout width stays blank until
       * a re-render. */}
      <Animated.View
        style={[
          tw.style('absolute bottom-0 left-0 right-0 top-0 overflow-hidden'),
          styles.fill,
          fillStyle,
        ]}
        testID={GraduationProgressSelectors.FILL}
      >
        <LinearGradient
          colors={
            isHighHeat
              ? [colors.warning.default, colors.success.default]
              : [colors.primary.default, colors.success.default]
          }
          end={{ x: 1, y: 0 }}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
          testID={GraduationProgressSelectors.FILL_GRADIENT}
        />
      </Animated.View>
      <Animated.View
        style={[
          tw.style('absolute bottom-0 left-0 top-0 overflow-hidden'),
          sheenClipStyle,
        ]}
        testID={GraduationProgressSelectors.SHEEN_CLIP}
      >
        <Animated.View
          style={[
            tw.style('absolute bottom-0 top-0'),
            { width: SHEEN_WIDTH },
            sheenStyle,
          ]}
          testID={GraduationProgressSelectors.SHEEN}
        >
          <LinearGradient
            colors={[
              colorWithOpacity(sheenTint, 0),
              colorWithOpacity(sheenTint, 0.45),
              colorWithOpacity(sheenTint, 0),
            ]}
            end={{ x: 1, y: 0 }}
            start={{ x: 0, y: 0 }}
            style={StyleSheet.absoluteFill}
            testID={GraduationProgressSelectors.SHEEN_GRADIENT}
          />
        </Animated.View>
      </Animated.View>
      <Animated.View
        style={[
          tw.style('absolute items-center justify-center'),
          {
            width: COMET_SIZE,
            height: COMET_SIZE,
            marginLeft: -COMET_SIZE / 2,
            marginTop: -(COMET_SIZE - FUSE_HEIGHT) / 2,
          },
          cometStyle,
        ]}
        testID={GraduationProgressSelectors.COMET}
      >
        <View
          style={[
            tw.style('absolute'),
            {
              width: COMET_SIZE,
              height: COMET_SIZE,
              borderRadius: COMET_SIZE / 2,
              backgroundColor: colors.success.muted,
            },
          ]}
        />
        <View
          style={{
            width: COMET_INNER_SIZE,
            height: COMET_INNER_SIZE,
            borderRadius: COMET_INNER_SIZE / 2,
            backgroundColor: colors.success.muted,
          }}
        />
      </Animated.View>
    </Animated.View>
  );
};

interface GraduationCountUpProps {
  template: string;
  target: number;
}

const GraduationCountUp = ({ template, target }: GraduationCountUpProps) => {
  const [value, setValue] = useState(0);
  const count = useSharedValue(0);
  const hasMounted = useRef(false);
  const handleFrame = useCallback((next: number) => {
    setValue(Math.round(next));
  }, []);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      count.set(0);
      count.set(
        withTiming(target, {
          duration: COUNT_UP_MOUNT_DURATION_MS,
          easing: MOUNT_EASING,
        }),
      );
      return;
    }
    count.set(withTiming(target, { duration: COUNT_UP_DELTA_DURATION_MS }));
    return;
  }, [target, count]);

  useAnimatedReaction(
    () => count.get(),
    (current) => {
      runOnJS(handleFrame)(current);
    },
    [target],
  );

  return (
    <RNText testID={GraduationProgressSelectors.COUNT_UP}>
      {template.replace(PERCENT_PLACEHOLDER, String(value))}
    </RNText>
  );
};

interface GraduationProgressDetailProps {
  viewModel: GraduationProgressViewModel;
}

/**
 * The graduation microcopy for the header subtitle: "24% to graduation" for
 * new tokens, "50% bonded" while bonding. The full raised/remaining amounts
 * live in the progressbar's accessibility label. The percent counts up on
 * mount (800 ms, tabular numerals) and renders statically under reduced
 * motion.
 */
export const GraduationProgressDetail = ({
  viewModel,
}: GraduationProgressDetailProps) => {
  const reduceMotion = useReducedMotion() ?? false;
  const { stage, percent } = viewModel;
  const displayPercent = getGraduationDisplayPercent(percent);
  const template =
    stage === 'bonding'
      ? strings('token_details_v1.graduation.bonding_detail', {
          percent: PERCENT_PLACEHOLDER,
        })
      : strings('token_details_v1.graduation.new_detail', {
          percent: PERCENT_PLACEHOLDER,
        });
  const text = template.replace(PERCENT_PLACEHOLDER, String(displayPercent));

  return (
    <Text
      // The fuse bar's progressbar node already announces this copy; hiding
      // the visual text keeps screen readers from reading the header twice.
      accessibilityElementsHidden
      color={TextColor.TextAlternative}
      ellipsizeMode="tail"
      fontWeight={FontWeight.Medium}
      importantForAccessibility="no-hide-descendants"
      numberOfLines={1}
      style={TABULAR_NUMS}
      testID={GraduationProgressSelectors.DETAIL}
      variant={TextVariant.BodySm}
    >
      {reduceMotion ? (
        text
      ) : (
        <GraduationCountUp template={template} target={displayPercent} />
      )}
    </Text>
  );
};
