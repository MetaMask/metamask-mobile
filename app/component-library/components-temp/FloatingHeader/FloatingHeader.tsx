import React, { useMemo } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { useTheme } from '../../../util/theme';
import { colorWithOpacity } from '../../../util/colors/colorWithOpacity';

export interface FloatingHeaderProps {
  children: React.ReactNode;
  onLayout: (event: LayoutChangeEvent) => void;
  /** Status bar space, when the screen doesn't already pad it. */
  topInset?: number;
  testID?: string;
}

const FADE_TAIL_HEIGHT = 16;
const FADE_OPACITIES = [1, 0.7, 0.35, 0];
const FADE_LOCATIONS = [0, 0.3, 0.7, 1];

export const FLOATING_HEADER_FADE_TEST_ID = 'floating-header-fade';

/** A JS header over the content on an iOS 26-style scroll edge fade; pair with `useFloatingHeaderInset`. */
const FloatingHeader = ({
  children,
  onLayout,
  topInset = 0,
  testID,
}: FloatingHeaderProps) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const fadeColors = useMemo(
    () =>
      FADE_OPACITIES.map((opacity) =>
        colorWithOpacity(colors.background.default, opacity),
      ),
    [colors.background.default],
  );

  return (
    <View
      pointerEvents="box-none"
      style={[
        tw.style('absolute left-0 right-0 top-0 z-10'),
        { paddingTop: topInset },
      ]}
      onLayout={onLayout}
      testID={testID}
    >
      <LinearGradient
        pointerEvents="none"
        colors={fadeColors}
        locations={FADE_LOCATIONS}
        style={[StyleSheet.absoluteFill, { bottom: -FADE_TAIL_HEIGHT }]}
        testID={FLOATING_HEADER_FADE_TEST_ID}
      />
      {children}
    </View>
  );
};

export default FloatingHeader;
