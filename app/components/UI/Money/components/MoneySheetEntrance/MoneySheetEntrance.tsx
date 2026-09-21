import React, { useEffect, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  MONEY_SHEET_ENTRANCE_DURATION_MS,
  MONEY_SHEET_ENTRANCE_TRANSLATE_Y,
  resolveMoneySheetEntrancePhase,
} from '../../constants/sheetEntrance';
import { useReduceMotionState } from '../../hooks/useReduceMotion';

interface MoneySheetEntranceProps {
  /**
   * Releases the step. Drive this from the sheet's `onOpen` so the wave is
   * sequenced after the open transition instead of competing with it.
   */
  isActive: boolean;
  /** Offset into the wave; see `moneySheetEntranceDelay`. */
  delayMs?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  testID?: string;
}

/**
 * One step of a Money sheet's entrance wave.
 *
 * Children stay mounted throughout and only opacity/transform animate. The
 * sheet's height is measured on its first layout and the open slide is armed
 * from that value, so anything that mounts late would resize the sheet
 * mid-slide — the exact artefact the sequencing is meant to remove.
 *
 * Because the children are mounted rather than absent, the step is inert to
 * touch until it has finished arriving.
 */
const MoneySheetEntrance = ({
  isActive,
  delayMs = 0,
  style,
  children,
  testID,
}: MoneySheetEntranceProps) => {
  const reduceMotionState = useReduceMotionState();

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(MONEY_SHEET_ENTRANCE_TRANSLATE_Y);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const phase = resolveMoneySheetEntrancePhase({ reduceMotionState, isActive });

  // A step that has not finished arriving is invisible but still laid out, so
  // it would otherwise take taps before the user can see it — a footer CTA
  // could be confirmed blind.
  const [hasArrived, setHasArrived] = useState(false);

  useEffect(() => {
    if (phase === 'hold') {
      setHasArrived(false);
      return;
    }

    if (phase === 'settle') {
      opacity.value = 1;
      translateY.value = 0;
      setHasArrived(true);
      return;
    }

    opacity.value = withDelay(
      delayMs,
      withTiming(1, { duration: MONEY_SHEET_ENTRANCE_DURATION_MS }, (done) => {
        if (done) scheduleOnRN(setHasArrived, true);
      }),
    );
    translateY.value = withDelay(
      delayMs,
      withTiming(0, { duration: MONEY_SHEET_ENTRANCE_DURATION_MS }),
    );
  }, [phase, delayMs, opacity, translateY]);

  return (
    <Animated.View
      style={[style, animatedStyle]}
      pointerEvents={hasArrived ? 'auto' : 'none'}
      testID={testID}
    >
      {children}
    </Animated.View>
  );
};

export default MoneySheetEntrance;
