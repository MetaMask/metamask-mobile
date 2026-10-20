import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colorWithOpacity } from '../../../util/colors/colorWithOpacity';
import { useTheme } from '../../../util/theme';

export interface StickyFooterGlassProps {
  children: React.ReactNode;
  /** Floats over the bottom of the screen so content scrolls behind it. */
  isOverlay?: boolean;
  /** Pads for the home indicator or Android navigation bar. */
  includesBottomInset?: boolean;
  /** Reports the footer's height, so the screen can inset its content. */
  onLayout?: (event: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const FADE_HEIGHT = 32;
const EDGE_OPACITIES = [0, 0.35, 0.7, 1];
const EDGE_LOCATIONS = [0, 0.3, 0.7, 1];
const OVERLAY_OPACITIES = [0, 0.55, 0.8, 0.95];
const OVERLAY_LOCATIONS = [0, 0.3, 0.65, 1];

const footerStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  edgeFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    height: FADE_HEIGHT,
  },
  overlayFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -FADE_HEIGHT,
    bottom: 0,
  },
});

/** A gradient footer container for content that scrolls behind sticky actions. */
const StickyFooterGlass = ({
  children,
  isOverlay = false,
  includesBottomInset = false,
  onLayout,
  style,
  testID,
}: StickyFooterGlassProps) => {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();

  const opacities = isOverlay ? OVERLAY_OPACITIES : EDGE_OPACITIES;
  const fadeColors = useMemo(
    () =>
      opacities.map((opacity) =>
        colorWithOpacity(colors.background.default, opacity),
      ),
    [colors.background.default, opacities],
  );

  return (
    <View
      pointerEvents="box-none"
      style={[
        isOverlay && footerStyles.overlay,
        style,
        includesBottomInset && { paddingBottom: bottom },
      ]}
      onLayout={onLayout}
      testID={testID}
    >
      <LinearGradient
        pointerEvents="none"
        colors={fadeColors}
        locations={isOverlay ? OVERLAY_LOCATIONS : EDGE_LOCATIONS}
        style={isOverlay ? footerStyles.overlayFade : footerStyles.edgeFade}
        testID={testID ? `${testID}-fade` : undefined}
      />
      {children}
    </View>
  );
};

StickyFooterGlass.displayName = 'StickyFooterGlass';

export default StickyFooterGlass;
