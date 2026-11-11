import { createContext, useContext, type RefObject } from 'react';
import type { View } from 'react-native';
import type { GestureType } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';

/**
 * Where the chart sits inside the sheet. `contentY` is the chart's top when
 * the list is scrolled to 0.
 */
export interface SheetChartFrame {
  hostRef: RefObject<View | null>;
  contentY: SharedValue<number>;
  height: SharedValue<number>;
  scrollY: SharedValue<number>;
  /** List scroll. The chart blocks it until a straight vertical swipe lets go. */
  gestures: GestureType[];
}

export const SheetChartFrameContext = createContext<SheetChartFrame | null>(
  null,
);

export const useSheetChartFrame = (): SheetChartFrame | null =>
  useContext(SheetChartFrameContext);
