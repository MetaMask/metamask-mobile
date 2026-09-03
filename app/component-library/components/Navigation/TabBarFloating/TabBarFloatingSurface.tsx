import React from 'react';
import {
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { GlassView, type GlassColorScheme } from 'expo-glass-effect';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export interface TabBarFloatingSurfaceProps {
  /** Optional: a bare surface is a material layer with content stacked above it. */
  children?: React.ReactNode;
  pointerEvents?: ViewProps['pointerEvents'];
  /**
   * Shape and layout classes only. Fill and border are supplied per path, since
   * glass draws its own material and edge.
   */
  twClassName: string;
  style?: StyleProp<ViewStyle>;
  isGlassEnabled: boolean;
  glassColorScheme: GlassColorScheme;
  testID?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}

/**
 * A rounded surface of the floating bar, drawn as Liquid Glass where the
 * platform supports it and as an opaque section fill everywhere else.
 *
 * Children must not paint their own background on the glass path, or they cover
 * the material.
 */
const TabBarFloatingSurface = ({
  children,
  pointerEvents,
  twClassName,
  style,
  isGlassEnabled,
  glassColorScheme,
  testID,
  onLayout,
}: TabBarFloatingSurfaceProps) => {
  const tw = useTailwind();

  if (isGlassEnabled) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={glassColorScheme}
        pointerEvents={pointerEvents}
        style={[tw.style(twClassName), style]}
        testID={testID}
        onLayout={onLayout}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View
      pointerEvents={pointerEvents}
      style={[tw.style(`${twClassName} border border-muted bg-section`), style]}
      testID={testID}
      onLayout={onLayout}
    >
      {children}
    </View>
  );
};

export default TabBarFloatingSurface;
