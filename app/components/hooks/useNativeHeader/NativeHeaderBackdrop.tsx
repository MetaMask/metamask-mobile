import React from 'react';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { HeaderGlassBackdrop } from '../../../component-library/components-temp/HeaderGlass';
import { NATIVE_HEADER_BAR_HEIGHT } from './useNativeHeader';

export interface NativeHeaderBackdropProps {
  /** From `useNativeHeaderScroll`; omit to keep the backdrop on. */
  scrollDistance?: SharedValue<number>;
  /** Scroll distance over which the backdrop fades in. */
  fadeInDistance?: number;
  testID?: string;
}

/**
 * The `HeaderGlass` backdrop under the transparent native bar. Render it after
 * the scroll view so it sits over the content, and pair it with
 * `useNativeHeader({ hidesScrollEdgeEffect: true })` so UIKit's own scroll
 * edge effect doesn't stack on top.
 */
const NativeHeaderBackdrop = ({
  scrollDistance,
  fadeInDistance,
  testID,
}: NativeHeaderBackdropProps) => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="none"
      style={[
        tw.style('absolute left-0 right-0 top-0'),
        { height: insets.top + NATIVE_HEADER_BAR_HEIGHT },
      ]}
      testID={testID}
    >
      <HeaderGlassBackdrop
        scrollDistance={scrollDistance}
        fadeInDistance={fadeInDistance}
      />
    </View>
  );
};

export default NativeHeaderBackdrop;
