import React, { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
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

  useEffect(() => {
    if (phase === 'hold') return;

    if (phase === 'settle') {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    opacity.value = withDelay(
      delayMs,
      withTiming(1, { duration: MONEY_SHEET_ENTRANCE_DURATION_MS }),
    );
    translateY.value = withDelay(
      delayMs,
      withTiming(0, { duration: MONEY_SHEET_ENTRANCE_DURATION_MS }),
    );
  }, [phase, delayMs, opacity, translateY]);

  return (
    <Animated.View style={[style, animatedStyle]} testID={testID}>
      {children}
    </Animated.View>
  );
};

export default MoneySheetEntrance;
