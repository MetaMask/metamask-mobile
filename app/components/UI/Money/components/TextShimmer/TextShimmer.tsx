import MaskedView from '@react-native-masked-view/masked-view';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ShimmerBand, useShimmerSweep } from '../../../Shimmer';

export interface TextShimmerProps {
  /**
   * The text element to shimmer. It is rendered as-is for its colour and
   * reused as the mask, so the highlight is clipped to the glyph shapes
   * rather than a rectangle.
   */
  children: React.ReactElement;
  /**
   * Width of the highlight band as a fraction of the measured text width.
   */
  widthFraction?: number;
  sweepDurationMs?: number;
  pauseDurationMs?: number;
  /**
   * Gradient stops for the highlight band. Defaults to a bright white sweep
   * that reads as a reflective glint over coloured text.
   */
  colors?: readonly string[];
  testID?: string;
}

const DEFAULT_COLORS = [
  'rgba(255,255,255,0)',
  'rgba(255,255,255,0.7)',
  'rgba(255,255,255,0)',
] as const;

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

/**
 * Renders `children` (a text element) and sweeps a bright highlight across it,
 * masked to the glyph shapes. The overlay is non-interactive.
 */
const TextShimmer: React.FC<TextShimmerProps> = ({
  children,
  widthFraction = 0.5,
  sweepDurationMs = 1000,
  pauseDurationMs = 4000,
  colors = DEFAULT_COLORS,
  testID,
}) => {
  const { width, bandWidth, animatedBandStyle, handleLayout } = useShimmerSweep(
    { widthFraction, sweepDurationMs, pauseDurationMs },
  );

  return (
    <View onLayout={handleLayout} style={styles.wrapper}>
      {children}
      {width > 0 && (
        <MaskedView
          pointerEvents="none"
          style={styles.overlay}
          maskElement={children}
          testID={testID}
        >
          <ShimmerBand
            bandWidth={bandWidth}
            animatedStyle={animatedBandStyle}
            colors={colors}
          />
        </MaskedView>
      )}
    </View>
  );
};

export default TextShimmer;
