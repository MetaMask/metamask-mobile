import { StyleSheet, type Animated, type ViewStyle } from 'react-native';
import { DRILLDOWN_CONTENT_OFFSET_Y } from './constants';

export const topGlowSvgLayerFill = StyleSheet.absoluteFillObject;

export const balanceBreakdownViewStyles = StyleSheet.create({
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    elevation: 3,
  },
  mainLayer: {
    flex: 1,
    zIndex: 1,
  },
  drillAnimWrap: {
    overflow: 'hidden',
  },
  /** Renders after legend in the tree so drilldown paints on top during crossfades. */
  drillContentLayer: {
    zIndex: 1,
    elevation: 1,
  },
  drillBootstrap: {
    opacity: 0,
    transform: [{ translateY: DRILLDOWN_CONTENT_OFFSET_Y }],
  },
  /**
   * Legend stays mounted for opacity animation but must not reserve height while
   * drilldown is showing, or the drill block is pushed down the scroll view.
   */
  legendZeroLayout: {
    height: 0,
    overflow: 'hidden',
  },
});

export function balanceBreakdownTopGlowContainerStyle(
  height: number,
): ViewStyle[] {
  return [balanceBreakdownViewStyles.topGlow, { height }];
}

export function balanceBreakdownDrillContentAnimStyle(
  opacity: Animated.Value,
  translateY: Animated.Value,
): {
  opacity: Animated.Value;
  transform: { translateY: Animated.Value }[];
} {
  return {
    opacity,
    transform: [{ translateY }],
  };
}

export function balanceBreakdownDrillHeaderSwatchStyle(
  color: string,
): ViewStyle {
  return {
    width: 12,
    height: 12,
    borderRadius: 4,
    backgroundColor: color,
  };
}
