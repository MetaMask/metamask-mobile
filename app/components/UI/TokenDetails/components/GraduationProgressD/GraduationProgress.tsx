import React, { memo, useEffect, useRef } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { ImpactMoment, useHaptics } from '../../../../../util/haptics';
import { strings } from '../../../../../../locales/i18n';
import type { TokenAssetRecord } from '../../queries/tokenAssetQuery';
import { TokenDetailsIds } from '../../testIds';
import { useTheme } from '../../../../../util/theme';
import {
  getGraduationProgressViewModel,
  type GraduationProgressViewModel,
} from './getGraduationProgressViewModel';
import {
  COUNT_UP_DELTA_DURATION_MS,
  COUNT_UP_MOUNT_DURATION_MS,
  GRADUATION_CELL_COUNT,
  GRADUATION_CELL_GAP_DP,
  GRADUATION_CELL_HEIGHT_DP,
  GRADUATION_CELL_RADIUS_DP,
  GRADUATION_DELTA_DURATION_MS,
  GRADUATION_FLOW_LOOP_MS,
  GRADUATION_FLOW_MAX_DIP,
  GRADUATION_FRONTIER_HAPTIC_DELAY_MS,
  GRADUATION_HUE_LADDER,
  GRADUATION_MOUNT_EASING_CONTROL_POINTS,
  GRADUATION_MOUNT_FILL_DURATION_MS,
  GRADUATION_PULSE_MIN_OPACITY,
  GRADUATION_PULSE_PERIOD_MS,
  GRADUATION_PULSE_STAGGER_MS,
} from './graduationProgress.constants';
import { createCubicBezierEasing, useCountUp } from './useCountUp';

const TABULAR_NUMS = { fontVariant: ['tabular-nums' as const] };

const COUNT_UP_EASING = createCubicBezierEasing(
  ...GRADUATION_MOUNT_EASING_CONTROL_POINTS,
);

const MOUNT_FILL_EASING = Easing.bezier(
  ...GRADUATION_MOUNT_EASING_CONTROL_POINTS,
);

const FLOW_PHASE_WINDOW = 0.2;

const cellFillFraction = (progress: number, index: number): number => {
  'worklet';
  const fill = progress / GRADUATION_CELL_COUNT - index;
  if (fill <= 0) {
    return 0;
  }
  if (fill >= 1) {
    return 1;
  }
  return fill;
};

const pulseFactor = (clock: number, phaseLagCycles: number): number => {
  'worklet';
  if (clock < 0) {
    return 1;
  }
  let t = (clock - phaseLagCycles) % 1;
  if (t < 0) {
    t += 1;
  }
  return (
    GRADUATION_PULSE_MIN_OPACITY +
    (1 - GRADUATION_PULSE_MIN_OPACITY) * (0.5 + 0.5 * Math.cos(2 * Math.PI * t))
  );
};

const flowFactor = (clock: number, phase: number): number => {
  'worklet';
  if (clock < 0) {
    return 1;
  }
  let t = (clock - phase) % 1;
  if (t < 0) {
    t += 1;
  }
  if (t >= FLOW_PHASE_WINDOW) {
    return 1;
  }
  return (
    1 - GRADUATION_FLOW_MAX_DIP * Math.sin(Math.PI * (t / FLOW_PHASE_WINDOW))
  );
};

interface GraduationProgressCellProps {
  index: number;
  progress: SharedValue<number>;
  pulseClock: SharedValue<number>;
  flowClock: SharedValue<number>;
  doesPulse: boolean;
  backgroundColor: string;
}

const GraduationProgressCell = ({
  index,
  progress,
  pulseClock,
  flowClock,
  doesPulse,
  backgroundColor,
}: GraduationProgressCellProps) => {
  const fillStyle = useAnimatedStyle(() => {
    const fill = cellFillFraction(progress.get(), index);
    const pulse = doesPulse
      ? pulseFactor(
          pulseClock.get(),
          (index * GRADUATION_PULSE_STAGGER_MS) / GRADUATION_PULSE_PERIOD_MS,
        )
      : 1;
    const flow = flowFactor(flowClock.get(), index / GRADUATION_CELL_COUNT);
    return {
      backgroundColor,
      height: '100%',
      width: `${fill * 100}%`,
      opacity: fill > 0 ? pulse * flow : 1,
    };
  }, [backgroundColor, doesPulse, index, progress, pulseClock, flowClock]);

  return (
    <Box
      twClassName={`flex-1 h-[${GRADUATION_CELL_HEIGHT_DP}px] rounded-[${GRADUATION_CELL_RADIUS_DP}px] bg-border-muted overflow-hidden`}
      testID={TokenDetailsIds.graduation.cell(index)}
    >
      <Animated.View
        style={fillStyle}
        testID={TokenDetailsIds.graduation.cellFill(index)}
      />
    </Box>
  );
};

interface GraduationCellsProps {
  percent: number;
  isAlmostGraduated: boolean;
  reducedMotion: boolean;
}

const GraduationCells = ({
  percent,
  isAlmostGraduated,
  reducedMotion,
}: GraduationCellsProps) => {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const progress = useSharedValue(0);
  const pulseClock = useSharedValue(-1);
  const flowClock = useSharedValue(-1);
  const isFirstMountRef = useRef(true);
  const fullCellCount = Math.min(
    GRADUATION_CELL_COUNT,
    Math.floor(percent / GRADUATION_CELL_COUNT),
  );
  const prevFullCellCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      progress.set(percent);
      return undefined;
    }
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      progress.set(
        withTiming(percent, {
          duration: GRADUATION_MOUNT_FILL_DURATION_MS,
          easing: MOUNT_FILL_EASING,
        }),
      );
      const timeoutId = setTimeout(() => {
        haptics.fireImpact(ImpactMoment.SliderTick);
      }, GRADUATION_FRONTIER_HAPTIC_DELAY_MS);
      return () => clearTimeout(timeoutId);
    }
    progress.set(
      withTiming(percent, {
        duration: GRADUATION_DELTA_DURATION_MS,
        easing: Easing.out(Easing.quad),
      }),
    );
    return undefined;
  }, [percent, reducedMotion, progress, haptics]);

  useEffect(() => {
    const prev = prevFullCellCountRef.current;
    prevFullCellCountRef.current = fullCellCount;
    if (
      prev == null ||
      fullCellCount <= prev ||
      reducedMotion ||
      isFirstMountRef.current
    ) {
      return;
    }
    haptics.fireImpact(ImpactMoment.SliderTick);
  }, [fullCellCount, reducedMotion, haptics]);

  useEffect(() => {
    if (reducedMotion) {
      return undefined;
    }
    flowClock.set(0);
    flowClock.set(
      withRepeat(
        withTiming(1, {
          duration: GRADUATION_FLOW_LOOP_MS,
          easing: Easing.linear,
        }),
        -1,
      ),
    );
    return undefined;
  }, [reducedMotion, flowClock]);

  useEffect(() => {
    if (!isAlmostGraduated || reducedMotion) {
      pulseClock.set(-1);
      return undefined;
    }
    pulseClock.set(0);
    pulseClock.set(
      withRepeat(
        withTiming(1, {
          duration: GRADUATION_PULSE_PERIOD_MS,
          easing: Easing.linear,
        }),
        -1,
      ),
    );
    return undefined;
  }, [isAlmostGraduated, reducedMotion, pulseClock]);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName={`gap-[${GRADUATION_CELL_GAP_DP}px]`}
      testID={TokenDetailsIds.graduation.cells}
    >
      {GRADUATION_HUE_LADDER.map((hueToken, index) => (
        <GraduationProgressCell
          key={`${hueToken}-${index}`}
          index={index}
          progress={progress}
          pulseClock={pulseClock}
          flowClock={flowClock}
          doesPulse={
            isAlmostGraduated &&
            index >= GRADUATION_CELL_COUNT - 2 &&
            percent > index * GRADUATION_CELL_COUNT
          }
          backgroundColor={colors[hueToken].default}
        />
      ))}
    </Box>
  );
};

const GraduationProgressModule = ({
  viewModel,
}: {
  viewModel: GraduationProgressViewModel;
}) => {
  const isBonding = viewModel.stage === 'bonding';
  const reducedMotion = useReducedMotion() ?? false;
  const displayedPercent = useCountUp(viewModel.displayPercent, {
    mountDurationMs: COUNT_UP_MOUNT_DURATION_MS,
    deltaDurationMs: COUNT_UP_DELTA_DURATION_MS,
    reducedMotion,
    easing: COUNT_UP_EASING,
  });
  const accessibilityLabel = isBonding
    ? strings('token_details_v1.graduation.accessibility.bonding', {
        percent: viewModel.displayPercent,
        raised: viewModel.raisedLabel ?? '',
        remaining: viewModel.remainingLabel ?? '',
      })
    : strings('token_details_v1.graduation.accessibility.new', {
        percent: viewModel.displayPercent,
      });

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      twClassName="rounded-2xl border border-muted bg-background-alternative p-4 gap-3 mb-4"
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: viewModel.displayPercent }}
      testID={TokenDetailsIds.graduation.module}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Tag
          severity={isBonding ? TagSeverity.Success : TagSeverity.Neutral}
          testID={TokenDetailsIds.graduation.stageTag}
        >
          {strings(
            isBonding
              ? 'token_details_v1.graduation.stage.bonding'
              : 'token_details_v1.graduation.stage.new',
          )}
        </Tag>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
          style={TABULAR_NUMS}
          testID={TokenDetailsIds.graduation.percent}
        >
          {`${displayedPercent}%`}
        </Text>
      </Box>
      {isBonding ? (
        <GraduationCells
          percent={viewModel.percent}
          isAlmostGraduated={viewModel.isAlmostGraduated}
          reducedMotion={reducedMotion}
        />
      ) : null}
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextMuted}
        testID={TokenDetailsIds.graduation.moneyRow}
      >
        {viewModel.raisedLabel != null && viewModel.remainingLabel != null
          ? `${strings('token_details_v1.graduation.raised', {
              amount: viewModel.raisedLabel,
            })} · ${strings('token_details_v1.graduation.to_graduation', {
              amount: viewModel.remainingLabel,
            })}`
          : strings('token_details_v1.graduation.to_graduation_compact')}
      </Text>
    </Box>
  );
};

export interface GraduationProgressProps {
  asset: TokenAssetRecord | null;
}

export const GraduationProgress = ({ asset }: GraduationProgressProps) => {
  const viewModel = getGraduationProgressViewModel(
    asset?.launchpadData,
    asset?.launchpad,
  );
  if (viewModel == null) {
    return null;
  }
  return <GraduationProgressModule viewModel={viewModel} />;
};

export default memo(GraduationProgress);
