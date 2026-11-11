import React, { useEffect, useRef, type ReactNode } from 'react';
import {
  I18nManager,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import {
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import AssetLogo from '../../../Assets/components/AssetLogo/AssetLogo';
import type { TokenI } from '../../../Tokens/types';
import { TokenDetailsIds } from '../../testIds';
import type { TokenAssetLaunchpadData } from '../../queries/tokenAssetQuery';
import {
  getGraduationProgressViewModel,
  isGraduationProgressVisible,
  type GraduationProgressViewModel,
} from './GraduationProgress.viewModel';

interface GraduationProgressProps {
  launchpadData: TokenAssetLaunchpadData | null | undefined;
  token: TokenI;
  children: ReactNode;
}

const RAIL_WIDTH = 48;
const CAP_ROW_HEIGHT = 16;
const RAIL_BOTTOM_RESERVE = 44;
const TRACK_LEFT = 22;
const TRACK_WIDTH = 4;
const AVATAR_RING_SIZE = 26;
const AVATAR_RING_OFFSET = -13;
const AVATAR_RING_LEFT = 11;
const PILL_ANCHOR_TOP = 16;
const MILESTONES = [25, 50, 75];

const MOUNT_DURATION_MS = 900;
const MOUNT_EASING = Easing.bezier(0.2, 0.8, 0.2, 1);
const DELTA_DURATION_MS = 300;
const COUNT_UP_DURATION_MS = 800;
const GRADIENT_FLOW_DURATION_MS = 2400;
const CAP_PULSE_DURATION_MS = 600;
const SPARK_CYCLE_DURATION_MS = 400;
const SPARK_RISE_DP = 10;
const SPARK_TOP = -12;

const SPARK_OFFSETS = [0, 0.25, 0.5, 0.75];
const SPARK_LEFTS = [17, 20.5, 26.5, 30];

const styles = StyleSheet.create({
  trackZone: {
    flex: 1,
    alignSelf: 'stretch',
  },
  track: {
    position: 'absolute',
    left: TRACK_LEFT,
    top: 0,
    bottom: 0,
    width: TRACK_WIDTH,
    borderRadius: TRACK_WIDTH / 2,
  },
  fill: {
    position: 'absolute',
    left: TRACK_LEFT,
    bottom: 0,
    width: TRACK_WIDTH,
    borderRadius: TRACK_WIDTH / 2,
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 28,
  },
  spark: {
    position: 'absolute',
    top: SPARK_TOP,
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  milestoneDot: {
    position: 'absolute',
    left: TRACK_LEFT - 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    transform: [{ translateY: 4 }],
  },
  milestoneLabel: {
    position: 'absolute',
    width: 16,
    transform: [{ translateY: 10 }],
  },
  milestoneLabelLtr: {
    left: 0,
    textAlign: 'right',
  },
  milestoneLabelRtl: {
    right: 0,
    textAlign: 'left',
  },
  riderColumn: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  riderAvatar: {
    position: 'absolute',
    top: AVATAR_RING_OFFSET,
    left: AVATAR_RING_LEFT,
    width: AVATAR_RING_SIZE,
    height: AVATAR_RING_SIZE,
    borderRadius: AVATAR_RING_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillAnchor: {
    position: 'absolute',
    top: PILL_ANCHOR_TOP,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  railColumn: {
    width: RAIL_WIDTH,
    alignSelf: 'stretch',
  },
  dexSpacer: {
    width: 4,
  },
  milestoneDotPassed: {
    borderWidth: 1.5,
  },
  milestoneDotUpcoming: {
    borderWidth: 1,
  },
  percentPillText: {
    fontWeight: FontWeight.Bold,
    padding: 0,
  },
});

const TABULAR_NUMS_STYLE: StyleProp<TextStyle> = {
  fontVariant: ['tabular-nums'],
};

type AnimatedTextInputProps = TextInputProps & {
  text?: string;
  animatedProps?: { text?: string };
};

const AnimatedTextInput = Animated.createAnimatedComponent(
  TextInput,
) as React.ComponentType<AnimatedTextInputProps>;

const CountUpPercentText = ({
  percent,
  testID,
  style,
}: {
  percent: number;
  testID: string;
  style: StyleProp<TextStyle>;
}) => {
  const reducedMotion = useReducedMotion();
  const startValue = reducedMotion ? percent : 0;
  const count = useSharedValue(startValue);

  useEffect(() => {
    if (reducedMotion) {
      count.set(percent);
      return;
    }
    count.set(
      withTiming(percent, {
        duration: COUNT_UP_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [count, percent, reducedMotion]);

  const animatedProps = useAnimatedProps<AnimatedTextInputProps>(() => ({
    text: `${Math.round(count.value)}%`,
  }));

  return (
    <AnimatedTextInput
      editable={false}
      defaultValue={`${Math.round(percent)}%`}
      animatedProps={animatedProps}
      style={style}
      testID={testID}
      allowFontScaling={false}
    />
  );
};

const SparkDot = ({
  spark,
  offset,
  left,
}: {
  spark: SharedValue<number>;
  offset: number;
  left: number;
}) => {
  const { colors } = useTheme();
  const animatedStyle = useAnimatedStyle(() => {
    const t = (spark.value + offset) % 1;
    return {
      opacity: Math.min(t * 6, 1) * (1 - t),
      transform: [{ translateY: -SPARK_RISE_DP * t }],
    };
  });

  return (
    <Animated.View
      testID={TokenDetailsIds.graduation.spark}
      style={[
        styles.spark,
        { left, backgroundColor: colors.success.default },
        animatedStyle,
      ]}
    />
  );
};

const DEXCap = ({ isNearGraduation }: { isNearGraduation: boolean }) => {
  const reducedMotion = useReducedMotion();
  const tw = useTailwind();
  const { colors } = useTheme();
  const capScale = useSharedValue(1);

  useEffect(() => {
    if (!isNearGraduation || reducedMotion) {
      capScale.set(1);
      return;
    }
    capScale.set(
      withRepeat(
        withTiming(1.3, {
          duration: CAP_PULSE_DURATION_MS,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      ),
    );
  }, [capScale, isNearGraduation, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: capScale.value }],
  }));

  return (
    <Animated.View
      testID={TokenDetailsIds.graduation.dexCap}
      style={[
        tw.style('h-3 w-3 rounded-full'),
        { backgroundColor: colors.success.default },
        animatedStyle,
      ]}
    />
  );
};

const MoneyRow = ({
  viewModel,
}: {
  viewModel: GraduationProgressViewModel;
}) => {
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      testID={TokenDetailsIds.graduation.moneyRow}
      entering={reducedMotion ? undefined : FadeIn.duration(250)}
    >
      <Box flexDirection={BoxFlexDirection.Row} twClassName="px-4 pb-2">
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          style={TABULAR_NUMS_STYLE}
        >
          {viewModel.moneyRowLeadingLabel}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          style={TABULAR_NUMS_STYLE}
        >
          {viewModel.moneyRowTrailingLabel}
        </Text>
      </Box>
    </Animated.View>
  );
};

const LaunchRail = ({
  viewModel,
  token,
}: {
  viewModel: GraduationProgressViewModel;
  token: TokenI;
}) => {
  const reducedMotion = useReducedMotion();
  const tw = useTailwind();
  const { colors, typography } = useTheme();

  const progress = useSharedValue(0);
  const sheen = useSharedValue(0);
  const spark = useSharedValue(0);
  const isFirstProgressRunRef = useRef(true);

  useEffect(() => {
    const target = viewModel.percent / 100;
    if (reducedMotion) {
      progress.set(target);
      return;
    }
    if (isFirstProgressRunRef.current) {
      isFirstProgressRunRef.current = false;
      progress.set(
        withTiming(target, {
          duration: MOUNT_DURATION_MS,
          easing: MOUNT_EASING,
        }),
      );
      return;
    }
    progress.set(withTiming(target, { duration: DELTA_DURATION_MS }));
  }, [progress, reducedMotion, viewModel.percent]);

  useEffect(() => {
    if (reducedMotion || viewModel.percent === 0) {
      sheen.set(0);
      return;
    }
    sheen.set(
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: GRADIENT_FLOW_DURATION_MS,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
  }, [reducedMotion, sheen, viewModel.percent]);

  useEffect(() => {
    if (!viewModel.isLastBand || reducedMotion) {
      spark.set(0);
      return;
    }
    spark.set(
      withRepeat(
        withTiming(1, {
          duration: SPARK_CYCLE_DURATION_MS,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );
  }, [reducedMotion, spark, viewModel.isLastBand]);

  const fillHeightStyle = useAnimatedStyle(() => ({
    height: `${progress.value * 100}%`,
  }));

  const sheenStyle = useAnimatedStyle(() => {
    const t = sheen.value;
    return {
      bottom: `${t * 100}%`,
      opacity: Math.min(t * 4, 1) * (1 - t),
    };
  });

  const isRTL = I18nManager.isRTL;
  const milestoneLabelSide = isRTL
    ? styles.milestoneLabelRtl
    : styles.milestoneLabelLtr;

  return (
    <Animated.View
      style={styles.railColumn}
      entering={reducedMotion ? undefined : FadeIn.duration(250)}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        style={{ height: CAP_ROW_HEIGHT }}
      >
        <View style={{ width: TRACK_LEFT - 6 }} />
        <DEXCap isNearGraduation={viewModel.isNearGraduation} />
        <View style={styles.dexSpacer} />
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextMuted}
          allowFontScaling={false}
        >
          {strings('token_details_v1.graduation.dex_label')}
        </Text>
      </Box>

      <View
        style={styles.trackZone}
        testID={TokenDetailsIds.graduation.rail}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={viewModel.accessibilityLabel}
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(viewModel.percent),
        }}
      >
        <View
          style={[styles.track, { backgroundColor: colors.border.default }]}
        />
        <Animated.View
          testID={TokenDetailsIds.graduation.fill}
          style={[styles.fill, fillHeightStyle]}
        >
          <LinearGradient
            colors={[colors.success.default, colors.primary.default]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View style={[styles.sheen, sheenStyle]}>
            <LinearGradient
              colors={['transparent', colors.success.muted, 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Animated.View>

        {MILESTONES.map((milestone) => {
          const isPassed = viewModel.percent >= milestone;
          return (
            <View
              key={milestone}
              style={[
                styles.milestoneDot,
                styles[
                  isPassed ? 'milestoneDotPassed' : 'milestoneDotUpcoming'
                ],
                {
                  bottom: `${milestone}%`,
                  borderColor: isPassed
                    ? colors.success.default
                    : colors.icon.muted,
                  backgroundColor: colors.background.default,
                },
              ]}
              pointerEvents="none"
            />
          );
        })}

        <Animated.View
          style={[styles.riderColumn, fillHeightStyle]}
          pointerEvents="none"
        >
          <View
            testID={TokenDetailsIds.graduation.rider}
            style={[
              styles.riderAvatar,
              tw.style('border border-muted'),
              { backgroundColor: colors.background.default },
            ]}
          >
            <AssetLogo asset={token} size={AvatarTokenSize.Sm} />
          </View>
          <View style={styles.pillAnchor}>
            <Box
              testID={TokenDetailsIds.graduation.percentPill}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="h-6 rounded-full bg-alternative border border-muted px-2"
            >
              <CountUpPercentText
                percent={viewModel.percent}
                testID={TokenDetailsIds.graduation.percentText}
                style={[
                  typography.sBodyXS as TextStyle,
                  { color: colors.text.default },
                  TABULAR_NUMS_STYLE,
                  styles.percentPillText,
                ]}
              />
            </Box>
          </View>
          {viewModel.isLastBand && !reducedMotion
            ? SPARK_OFFSETS.map((offset, index) => (
                <SparkDot
                  key={offset}
                  spark={spark}
                  offset={offset}
                  left={SPARK_LEFTS[index]}
                />
              ))
            : null}
        </Animated.View>

        {MILESTONES.map((milestone) => (
          <Text
            key={milestone}
            variant={TextVariant.BodyXs}
            color={TextColor.TextMuted}
            style={[
              styles.milestoneLabel,
              milestoneLabelSide,
              { bottom: `${milestone}%` },
            ]}
            allowFontScaling={false}
          >
            {milestone}
          </Text>
        ))}
      </View>

      <View style={{ height: RAIL_BOTTOM_RESERVE }} />
    </Animated.View>
  );
};

export const GraduationProgress = ({
  launchpadData,
  token,
  children,
}: GraduationProgressProps) => {
  const isVisible =
    launchpadData != null && isGraduationProgressVisible(launchpadData);
  const viewModel =
    isVisible && launchpadData != null
      ? getGraduationProgressViewModel(launchpadData)
      : null;

  return (
    <>
      <Box flexDirection={BoxFlexDirection.Row}>
        {viewModel != null ? (
          <LaunchRail viewModel={viewModel} token={token} />
        ) : null}
        <Box twClassName="flex-1">{children}</Box>
      </Box>
      {viewModel != null ? <MoneyRow viewModel={viewModel} /> : null}
    </>
  );
};
