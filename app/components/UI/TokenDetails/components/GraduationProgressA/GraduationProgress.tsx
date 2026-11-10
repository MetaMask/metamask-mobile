import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  I18nManager,
  TextInput,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxBorderColor,
  BoxFlexDirection,
  BoxJustifyContent,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { FungibleAssetPrice } from '@metamask/assets-controller';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

import { useHaptics } from '../../../../../util/haptics';
import { useTheme } from '../../../../../util/theme';
import type { TokenAssetLaunchpadData } from '../../queries/tokenAssetQuery';
import {
  GRADUATION_TICK_POSITIONS as GraduationTickPositions,
  GraduationProgressSelectors,
} from './GraduationProgress.testIds';
import {
  formatGraduationPercentLabel,
  getGraduationProgressViewModel,
  type GraduationProgressViewModel,
} from './GraduationProgress.viewmodel';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type AnimatedTextInputProps = React.ComponentProps<typeof AnimatedTextInput>;

const TABULAR_NUMS = { fontVariant: ['tabular-nums' as const] };

const FILL_MOUNT_DURATION_MS = 900;
const FILL_MOUNT_EASING = Easing.bezier(0.2, 0.8, 0.2, 1);
const FILL_DELTA_DURATION_MS = 300;
const COUNT_UP_MOUNT_DURATION_MS = 800;
const COUNT_UP_DELTA_DURATION_MS = 300;
const REDUCED_MOTION_SETTLE_MS = 200;
const GRADIENT_FLOW_LOOP_MS = 2400;
const AURA_PULSE_DURATION_MS = 800;
const AURA_MIN_OPACITY = 0.4;
const AURA_MAX_OPACITY = 0.9;
const BAR_HEIGHT = 8;
const BAR_RADIUS = 4;
const AURA_SPREAD = 3;
const TICK_WIDTH = 1;
const GRADIENT_TRACKS = 2;

const START_EDGE_STYLE = { start: 0 };
const AURA_BASE_STYLE = {
  borderRadius: BAR_RADIUS + AURA_SPREAD,
  bottom: -AURA_SPREAD,
  end: 0,
  start: 0,
  top: -AURA_SPREAD,
};

const buildTickStyle = (position: number, color: string): ViewStyle => ({
  backgroundColor: color,
  bottom: 0,
  position: 'absolute',
  start: `${position}%` as `${number}%`,
  top: 0,
  width: TICK_WIDTH,
});

export interface GraduationProgressProps {
  launchpadData: TokenAssetLaunchpadData | null;
  launchpad: string | null;
  marketData: FungibleAssetPrice | null;
  currentCurrency: string | undefined;
}

interface GraduationProgressCardProps {
  viewModel: GraduationProgressViewModel;
}

const GraduationProgressCard = ({
  viewModel,
}: GraduationProgressCardProps): React.JSX.Element => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const haptics = useHaptics();
  const isRtl = I18nManager.isRTL;

  const percent = useSharedValue(0);
  const percentText = useSharedValue(0);
  const flow = useSharedValue(1);
  const trackWidth = useSharedValue(0);
  const auraOpacity = useSharedValue(AURA_MIN_OPACITY);
  const isMountAnimation = useRef(true);
  const nearGraduationHapticFired = useRef(false);

  useEffect(() => {
    cancelAnimation(percent);
    cancelAnimation(percentText);
    if (reduceMotion) {
      percent.set(
        withTiming(viewModel.percent, { duration: REDUCED_MOTION_SETTLE_MS }),
      );
      percentText.set(
        withTiming(viewModel.percent, { duration: REDUCED_MOTION_SETTLE_MS }),
      );
    } else if (isMountAnimation.current) {
      isMountAnimation.current = false;
      percent.set(
        withTiming(viewModel.percent, {
          duration: FILL_MOUNT_DURATION_MS,
          easing: FILL_MOUNT_EASING,
        }),
      );
      percentText.set(
        withTiming(viewModel.percent, {
          duration: COUNT_UP_MOUNT_DURATION_MS,
        }),
      );
    } else {
      percent.set(
        withTiming(viewModel.percent, { duration: FILL_DELTA_DURATION_MS }),
      );
      percentText.set(
        withTiming(viewModel.percent, {
          duration: COUNT_UP_DELTA_DURATION_MS,
        }),
      );
    }
    return () => {
      cancelAnimation(percent);
      cancelAnimation(percentText);
    };
  }, [percent, percentText, reduceMotion, viewModel.percent]);

  useEffect(() => {
    if (reduceMotion) {
      flow.set(1);
      return undefined;
    }
    cancelAnimation(flow);
    flow.set(0);
    flow.set(
      withRepeat(
        withTiming(1, {
          duration: GRADIENT_FLOW_LOOP_MS,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(flow);
  }, [flow, reduceMotion]);

  useEffect(() => {
    if (!viewModel.isNearGraduation || reduceMotion) {
      return undefined;
    }
    cancelAnimation(auraOpacity);
    auraOpacity.set(AURA_MIN_OPACITY);
    auraOpacity.set(
      withRepeat(
        withTiming(AURA_MAX_OPACITY, {
          duration: AURA_PULSE_DURATION_MS,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(auraOpacity);
  }, [auraOpacity, reduceMotion, viewModel.isNearGraduation]);

  useEffect(() => {
    if (!viewModel.isNearGraduation || reduceMotion) {
      return;
    }
    if (nearGraduationHapticFired.current) {
      return;
    }
    nearGraduationHapticFired.current = true;
    haptics.playSelection();
  }, [haptics, reduceMotion, viewModel.isNearGraduation]);

  const handleTrackLayout = useCallback(
    ({
      nativeEvent: {
        layout: { width },
      },
    }: LayoutChangeEvent): void => {
      trackWidth.set(width);
    },
    [trackWidth],
  );

  const fillStyle = useAnimatedStyle((): { width: number } => {
    const fraction = Math.min(1, Math.max(0, percent.get() / 100));
    return { width: fraction * trackWidth.get() };
  });

  const gradientStyle = useAnimatedStyle(
    (): { width: number; transform: [{ translateX: number }] } => {
      const direction = isRtl ? -1 : 1;
      return {
        width: trackWidth.get() * GRADIENT_TRACKS,
        transform: [
          { translateX: (flow.get() - 1) * direction * trackWidth.get() },
        ],
      };
    },
  );

  const auraStyle = useAnimatedStyle((): { opacity: number } => ({
    opacity: auraOpacity.get(),
  }));

  const percentTextProps = useAnimatedProps((): { text: string } => ({
    text: formatGraduationPercentLabel(percentText.get()),
  }));

  const isBonding = viewModel.stage === 'bonding';
  const fillColors = viewModel.isNearGraduation
    ? [colors.warning.default, colors.success.default]
    : [colors.primary.default, colors.success.default];
  const flowColors = [
    fillColors[0],
    fillColors[1],
    fillColors[0],
    fillColors[1],
    fillColors[0],
  ];
  const tagDotStyle = useMemo(
    () => ({
      backgroundColor: isBonding
        ? colors.success.default
        : colors.primary.default,
    }),
    [colors.primary.default, colors.success.default, isBonding],
  );
  const trackStyle = useMemo(
    () => ({ backgroundColor: colors.border.muted }),
    [colors.border.muted],
  );
  const auraStyleBase = useMemo(
    () => ({ ...AURA_BASE_STYLE, backgroundColor: colors.success.muted }),
    [colors.success.muted],
  );
  const tickColor = colors.background.alternative;

  return (
    <Box
      backgroundColor={BoxBackgroundColor.BackgroundAlternative}
      borderColor={BoxBorderColor.BorderMuted}
      borderWidth={1}
      gap={3}
      twClassName="mb-3 rounded-2xl p-4"
      testID={GraduationProgressSelectors.CARD}
    >
      <Box
        alignItems={BoxAlignItems.Center}
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
      >
        <Tag
          severity={isBonding ? TagSeverity.Success : TagSeverity.Neutral}
          startAccessory={
            <View style={[tw.style('h-1.5 w-1.5 rounded-full'), tagDotStyle]} />
          }
          testID={GraduationProgressSelectors.TAG}
        >
          {viewModel.stageLabel}
        </Tag>
        <AnimatedTextInput
          accessible={false}
          animatedProps={
            percentTextProps as unknown as AnimatedTextInputProps['animatedProps']
          }
          defaultValue={viewModel.percentLabel}
          editable={false}
          style={[
            tw.style('text-body-md font-default-bold text-default p-0'),
            TABULAR_NUMS,
          ]}
          testID={GraduationProgressSelectors.PERCENT}
        />
      </Box>

      <View style={{ height: BAR_HEIGHT }}>
        {viewModel.isNearGraduation ? (
          <Animated.View
            style={[
              tw.style('absolute rounded-full'),
              auraStyleBase,
              auraStyle,
            ]}
            testID={GraduationProgressSelectors.AURA}
          />
        ) : null}
        <Box
          accessibilityLabel={viewModel.accessibilityLabel}
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(viewModel.percent),
          }}
          onLayout={handleTrackLayout}
          style={trackStyle}
          twClassName="h-2 w-full overflow-hidden rounded"
          testID={GraduationProgressSelectors.BAR}
        >
          <Animated.View
            style={[
              tw.style('absolute top-0 bottom-0 rounded overflow-hidden'),
              START_EDGE_STYLE,
              fillStyle,
            ]}
            testID={GraduationProgressSelectors.FILL}
          >
            <Animated.View
              style={[
                tw.style('absolute top-0 bottom-0'),
                START_EDGE_STYLE,
                gradientStyle,
              ]}
            >
              <LinearGradient
                colors={flowColors}
                end={{ x: isRtl ? 0 : 1, y: 0.5 }}
                start={{ x: isRtl ? 1 : 0, y: 0.5 }}
                style={tw.style('h-full w-full')}
              />
            </Animated.View>
          </Animated.View>
          {GraduationTickPositions.map((position) => (
            <View
              key={position}
              style={buildTickStyle(position, tickColor)}
              testID={GraduationProgressSelectors.tick(position)}
            />
          ))}
        </Box>
      </View>

      <Text
        color={TextColor.TextMuted}
        numberOfLines={2}
        style={TABULAR_NUMS}
        testID={GraduationProgressSelectors.DETAIL}
        variant={TextVariant.BodySm}
      >
        {viewModel.detailLabel}
      </Text>
    </Box>
  );
};

export const GraduationProgress = ({
  launchpadData,
  launchpad,
  marketData,
  currentCurrency,
}: GraduationProgressProps): React.JSX.Element | null => {
  const viewModel = useMemo(
    () =>
      getGraduationProgressViewModel({
        currentCurrency,
        launchpad,
        launchpadData,
        marketData,
      }),
    [currentCurrency, launchpad, launchpadData, marketData],
  );
  if (viewModel === null) {
    return null;
  }
  return <GraduationProgressCard viewModel={viewModel} />;
};

export default memo(GraduationProgress);
