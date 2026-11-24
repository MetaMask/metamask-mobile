import React, { useCallback, useState } from 'react';
import { StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, { type SharedValue } from 'react-native-reanimated';
import { useFloatingActionsScrollHide } from '../../../../hooks/useFloatingActionsScrollHide';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
});

export interface PredictFloatingActionsFooterProps {
  /** The page's scroll offset; a scroll down slides the actions away. */
  scrollY: SharedValue<number>;
  /** Distance (px) from the bottom of the screen, e.g. the safe area. */
  bottom: number;
  /** Reports the footer height so the page can leave room under its content. */
  onHeightChange?: (height: number) => void;
  testID?: string;
  children: React.ReactNode;
}

/**
 * Actions floating over the page content, like the Perps and Token details
 * footers. They slide off the bottom on a scroll down and return on a scroll
 * up; while hidden they drop touches and accessibility.
 */
const PredictFloatingActionsFooter = ({
  scrollY,
  bottom,
  onHeightChange,
  testID,
  children,
}: PredictFloatingActionsFooterProps) => {
  const [height, setHeight] = useState(0);
  const { slideStyle, isHidden } = useFloatingActionsScrollHide({
    scrollY,
    travel: height + bottom,
  });

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextHeight = event.nativeEvent.layout.height;
      setHeight(nextHeight);
      onHeightChange?.(nextHeight);
    },
    [onHeightChange],
  );

  return (
    <Animated.View
      testID={testID}
      pointerEvents={isHidden ? 'none' : 'box-none'}
      accessibilityElementsHidden={isHidden}
      importantForAccessibility={isHidden ? 'no-hide-descendants' : 'auto'}
      style={[styles.container, { bottom }, slideStyle]}
      onLayout={handleLayout}
    >
      {children}
    </Animated.View>
  );
};

export default PredictFloatingActionsFooter;
