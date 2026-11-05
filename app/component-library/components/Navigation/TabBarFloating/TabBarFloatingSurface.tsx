import React from 'react';
import {
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { useLiquidGlass } from '../../../hooks/useLiquidGlass';
import { useTheme } from '../../../../util/theme';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import type { NetworkTier } from '../../../../util/deviceCapability/types';
import { TAB_BAR_FLOATING_BLUR_INTENSITY } from './TabBarFloating.constants';

export type TabBarMaterial = 'glass' | 'blur' | 'opaque';

export interface ResolveTabBarMaterialInput {
  isGlassEnabled: boolean;
  isBlurEnabled: boolean;
  /**
   * Read so the device-capability matrix is applied. A local backdrop sample
   * does not get cheaper on a slow network. `null` is unknown, not offline.
   */
  networkTier: NetworkTier | null;
}

/**
 * Same chain as header capsules: Liquid Glass, then system blur, then an
 * opaque fill. Low hardware already arrives here with both flags false,
 * because `useBlurMaterial` skips blur on that tier. Unknown hardware stays
 * on the product path.
 *
 * @param input - Glass and blur availability, plus the network tier.
 * @returns The chrome material to draw.
 */
export const resolveTabBarMaterial = ({
  isGlassEnabled,
  isBlurEnabled,
  networkTier: _networkTier,
}: ResolveTabBarMaterialInput): TabBarMaterial => {
  if (isGlassEnabled) {
    return 'glass';
  }
  if (isBlurEnabled) {
    return 'blur';
  }
  return 'opaque';
};

export interface TabBarFloatingSurfaceProps {
  children?: React.ReactNode;
  twClassName?: string;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: ViewProps['pointerEvents'];
  testID?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}

/**
 * A surface of the floating tab bar. iOS 26 draws Liquid Glass. Older iOS
 * draws the system chrome blur. Everywhere else, including low-memory
 * devices, the fill is opaque.
 *
 * Children must not paint their own background on the glass or blur path,
 * or they cover the material.
 */
const TabBarFloatingSurface = ({
  children,
  twClassName = '',
  style,
  pointerEvents,
  testID,
  onLayout,
}: TabBarFloatingSurfaceProps) => {
  const tw = useTailwind();
  const { shadows } = useTheme();
  const { isGlassEnabled, glassColorScheme, isBlurEnabled, blurTint } =
    useLiquidGlass();
  const networkTier = useNetworkTier();
  const material = resolveTabBarMaterial({
    isGlassEnabled,
    isBlurEnabled,
    networkTier,
  });
  const sharedProps = { pointerEvents, testID, onLayout };

  if (material === 'glass') {
    return (
      <View
        style={[tw.style('rounded-full'), shadows.size.md, style]}
        {...sharedProps}
      >
        <GlassView
          glassEffectStyle="regular"
          colorScheme={glassColorScheme}
          isInteractive
          // The native glass only takes the capsule's corners when clipped.
          style={tw.style('h-full w-full overflow-hidden', twClassName)}
        >
          {children}
        </GlassView>
      </View>
    );
  }

  if (material === 'blur') {
    return (
      <BlurView
        // The chrome family is what UIKit puts behind its own bars, so it reads
        // as bar material rather than as a panel dropped on top of one.
        tint={blurTint}
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
