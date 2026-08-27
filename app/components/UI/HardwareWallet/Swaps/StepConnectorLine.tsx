import React, { memo, useCallback, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from '../../../../util/theme';
import { HardwareWalletsSwapsSelectorsIDs } from './HardwareWalletsSwaps.testIds';

const CONNECTOR_MIN_HEIGHT = 16;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    minHeight: CONNECTOR_MIN_HEIGHT,
    width: 32,
  },
});

interface StepConnectorLineProps {
  /** Optional test ID override for the connector container. */
  testID?: string;
}

/**
 * Vertical dashed connector rendered between hardware wallet swap progress steps.
 *
 * Height expands to match the adjacent step content via `onLayout`.
 */
export const StepConnectorLine = memo(({ testID }: StepConnectorLineProps) => {
  const { colors } = useTheme();
  const [height, setHeight] = useState(CONNECTOR_MIN_HEIGHT);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight > 0) {
      setHeight(Math.max(nextHeight, CONNECTOR_MIN_HEIGHT));
    }
  }, []);

  const containerWidth = 32;

  return (
    <View
      style={styles.container}
      onLayout={handleLayout}
      testID={testID ?? HardwareWalletsSwapsSelectorsIDs.STEP_CONNECTOR}
    >
      <Svg
        style={StyleSheet.absoluteFill}
        width={containerWidth}
        height={height}
      >
        <Line
          x1={containerWidth / 2}
          y1="0"
          x2={containerWidth / 2}
          y2={height}
          stroke={colors.border.muted}
          strokeWidth={2}
          strokeDasharray="2,4"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
});
