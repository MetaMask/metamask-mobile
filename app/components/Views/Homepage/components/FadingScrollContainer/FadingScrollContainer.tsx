import React, { useCallback, useState } from 'react';
import {
  NativeSyntheticEvent,
  NativeScrollEvent,
  View,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../../../../util/theme';
import { colorWithOpacity } from '../../../../../util/colors';

const FADE_WIDTH = 40;
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
    width: FADE_WIDTH,
    pointerEvents: 'none',
  },
});

export interface ScrollRenderProps {
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle: number;
}

interface FadingScrollContainerProps {
  children: (scrollProps: ScrollRenderProps) => React.ReactNode;
  testID?: string;
}

/**
 * Wraps a horizontal scroll view (ScrollView / FlatList) with a right-edge
 * fade gradient that disappears as the user scrolls to the end.
 *
 * Uses a render-prop so the consumer wires `onScroll` and
 * `scrollEventThrottle` onto their own scrollable component.
 */
const FadingScrollContainer: React.FC<FadingScrollContainerProps> = ({
  children,
  testID,
}) => {
  const { colors } = useTheme();
  const [fadeOpacity, setFadeOpacity] = useState(1);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const scrollableWidth = contentSize.width - layoutMeasurement.width;

      if (scrollableWidth <= 0) {
        setFadeOpacity(0);
        return;
      }

      const distanceFromEnd = scrollableWidth - contentOffset.x;
      setFadeOpacity(
        Math.min(1, Math.max(0, distanceFromEnd / FADE_THRESHOLD)),
      );
    },
    [],
  );

  return (
    <View style={styles.container} testID={testID}>
      {children({ onScroll, scrollEventThrottle: 16 })}
      {fadeOpacity > 0 && (
        <LinearGradient
          colors={[
            colorWithOpacity(colors.background.default, 0),
            colors.background.default,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fadeOverlay, { opacity: fadeOpacity }]}
        />
      )}
    </View>
  );
};

export default FadingScrollContainer;
