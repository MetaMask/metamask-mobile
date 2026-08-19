import React, { useRef } from 'react';
import { Box } from '@metamask/design-system-react-native';

/** Min vertical movement (px) treated as scroll, not a tap. Absorbs jitter. */
const SCROLL_THRESHOLD = 8;

/**
 * Wraps children and fires `onTap` only when the touch ends without a scroll
 * gesture. Uses raw touch events so movement is detected even while a parent
 * FlashList is absorbing a scroll.
 */
const TapView: React.FC<{
  onTap?: () => void;
  children: React.ReactNode;
}> = ({ onTap, children }) => {
  const startY = useRef(0);
  const didScroll = useRef(false);
  return (
    <Box
      onTouchStart={(e) => {
        startY.current = e.nativeEvent.pageY;
        didScroll.current = false;
      }}
      onTouchMove={(e) => {
        if (Math.abs(e.nativeEvent.pageY - startY.current) > SCROLL_THRESHOLD) {
          didScroll.current = true;
        }
      }}
      onTouchEnd={() => {
        if (!didScroll.current) onTap?.();
      }}
    >
      {children}
    </Box>
  );
};

export default TapView;
