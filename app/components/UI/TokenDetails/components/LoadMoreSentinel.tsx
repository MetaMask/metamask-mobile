import React, { useCallback, useEffect, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

/** How far past the screen a footer may sit and still count as reached. */
export const LOAD_MORE_THRESHOLD_PX = 600;

/** How often a mounted list checks whether its footer has scrolled into view. */
export const VISIBILITY_CHECK_MS = 400;

const styles = StyleSheet.create({
  // An empty view measures as height 0, and the visibility check ignores that,
  // so the footer would never ask for another page. One pixel is enough to
  // measure, and `collapsable={false}` stops Android from dropping the view.
  sentinel: {
    height: 1,
  },
});

export interface LoadMoreSentinelProps {
  /** Renders and polls only while another page can be requested. */
  enabled: boolean;
  /** Called every time the probe measures itself near the viewport. */
  onVisible: () => void;
}

/**
 * Footer probe shared by the Token Details V1 paginated tabs (Feed, Holders).
 *
 * These lists render inside the screen's own `ScrollView`, so there is no
 * `onEndReached` to hook: the probe measures itself on a timer instead and
 * asks for the next page once it comes within {@link LOAD_MORE_THRESHOLD_PX}
 * of the viewport.
 */
export const LoadMoreSentinel: React.FC<LoadMoreSentinelProps> = ({
  enabled,
  onVisible,
}) => {
  const ref = useRef<View>(null);
  const onVisibleRef = useRef(onVisible);
  onVisibleRef.current = onVisible;

  const check = useCallback(() => {
    ref.current?.measureInWindow((_x, y, _width, height) => {
      if (height <= 0) {
        return;
      }
      const screenHeight = Dimensions.get('window').height;
      if (y < screenHeight + LOAD_MORE_THRESHOLD_PX && y + height > 0) {
        onVisibleRef.current();
      }
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    check();
    const intervalId = setInterval(check, VISIBILITY_CHECK_MS);
    return () => clearInterval(intervalId);
  }, [check, enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <View
      ref={ref}
      collapsable={false}
      style={styles.sentinel}
      onLayout={check}
    />
  );
};

export default LoadMoreSentinel;
