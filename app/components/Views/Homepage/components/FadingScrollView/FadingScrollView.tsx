import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../../../../util/theme';
import { colorWithOpacity } from '../../../../../util/colors';

const DEFAULT_FADE_WIDTH = 40;
const FADE_THRESHOLD = 100;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  fadeOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
});

interface FadingScrollViewProps extends ScrollViewProps {
  /** Width of the fade overlay in pixels (default: 40) */
  fadeWidth?: number;
  children: React.ReactNode;
}

/**
 * Horizontal ScrollView with a fade-out gradient on the right edge.
 * The fade disappears as the user scrolls to the end.
 */
const FadingScrollView: React.FC<FadingScrollViewProps> = ({
  fadeWidth = DEFAULT_FADE_WIDTH,
  children,
  onScroll: externalOnScroll,
  ...scrollViewProps
}) => {
  const { colors } = useTheme();
  const [fadeOpacity, setFadeOpacity] = useState(1);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const scrollableWidth = contentSize.width - layoutMeasurement.width;

      if (scrollableWidth <= 0) {
        setFadeOpacity(0);
      } else {
        const distanceFromEnd = scrollableWidth - contentOffset.x;
        setFadeOpacity(
          Math.min(1, Math.max(0, distanceFromEnd / FADE_THRESHOLD)),
        );
      }

      // Forward to external handler if provided
      externalOnScroll?.(event);
    },
    [externalOnScroll],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        {...scrollViewProps}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {children}
      </ScrollView>
      {fadeOpacity > 0 && (
        <LinearGradient
          colors={[
            colorWithOpacity(colors.background.default, 0),
            colors.background.default,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.fadeOverlay,
            { width: fadeWidth, opacity: fadeOpacity },
          ]}
        />
      )}
    </View>
  );
};

export default FadingScrollView;
