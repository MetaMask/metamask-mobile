import React from 'react';
import type {
  LayoutChangeEvent,
  StyleProp,
  ViewProps,
  ViewStyle,
} from 'react-native';

import ElevationSurface from '../../../components-temp/ElevationSurface';
import { ElevationRole } from '../../../components-temp/ElevationSurface/elevation';
import { TAB_BAR_FLOATING_BLUR_INTENSITY } from './TabBarFloating.constants';

export interface TabBarFloatingSurfaceProps {
  children?: React.ReactNode;
  twClassName?: string;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: ViewProps['pointerEvents'];
  testID?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
  /** Lets the circular action react to touch. The pill leaves this off. */
  isInteractive?: boolean;
}

/**
 * Floating tab-bar chrome. Liquid Glass where the OS can draw it, a system
 * material on older iOS, and an opaque section everywhere else, including
 * low-memory devices and Reduce Transparency.
 *
 * Children must not paint their own background on the translucent path, or
 * they cover the material. The selected tab is a flat `bg-muted` state on
 * top of this surface, not a second piece of glass.
 */
const TabBarFloatingSurface = ({
  children,
  twClassName = '',
  style,
  pointerEvents,
  testID,
  onLayout,
  isInteractive = false,
}: TabBarFloatingSurfaceProps) => (
  <ElevationSurface
    role={ElevationRole.Glass}
    twClassName={`${twClassName} border border-muted`}
    style={style}
    pointerEvents={pointerEvents}
    testID={testID}
    onLayout={onLayout}
    isInteractive={isInteractive}
    blurIntensity={TAB_BAR_FLOATING_BLUR_INTENSITY}
  >
    {children}
  </ElevationSurface>
);

export default TabBarFloatingSurface;
