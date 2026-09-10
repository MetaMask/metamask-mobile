import React from 'react';
import {
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import type { UseBlurMaterialResult } from '../../../hooks/useBlurMaterial';
import { TAB_BAR_FLOATING_BLUR_INTENSITY } from './TabBarFloating.constants';

export interface TabBarFloatingSurfaceProps
  extends Pick<UseBlurMaterialResult, 'isBlurAvailable' | 'colorScheme'> {
  children?: React.ReactNode;
  twClassName?: string;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: ViewProps['pointerEvents'];
  testID?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}

/**
 * A surface of the floating tab bar, drawn as a system chrome material where
 * the platform supports it and as an opaque fill everywhere else.
 *
 * Children must not paint their own background on the blur path, or they cover
 * the material.
 */
const TabBarFloatingSurface = ({
  children,
  twClassName = '',
  style,
  isBlurAvailable,
  colorScheme,
  pointerEvents,
  testID,
  onLayout,
}: TabBarFloatingSurfaceProps) => {
  const tw = useTailwind();
  const sharedProps = { pointerEvents, testID, onLayout };

  if (isBlurAvailable) {
    return (
      <BlurView
        // The chrome family is what UIKit puts behind its own bars, so it reads
        // as bar material rather than as a panel dropped on top of one.
        tint={
          colorScheme === 'dark'
            ? 'systemChromeMaterialDark'
            : 'systemChromeMaterialLight'
        }
        intensity={TAB_BAR_FLOATING_BLUR_INTENSITY}
        // The blur is a native layer, so it only takes the capsule's corners
        // when the view clips to them.
        style={[
          tw.style(`${twClassName} overflow-hidden border border-muted`),
          style,
        ]}
        {...sharedProps}
      >
        {children}
      </BlurView>
    );
  }

  return (
    <View
      style={[tw.style(`${twClassName} border border-muted bg-section`), style]}
      {...sharedProps}
    >
      {children}
    </View>
  );
};

export default TabBarFloatingSurface;
