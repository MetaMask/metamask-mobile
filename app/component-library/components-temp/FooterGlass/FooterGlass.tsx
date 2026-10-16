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

import { useTheme } from '../../../util/theme';
import { colorWithOpacity } from '../../../util/colors/colorWithOpacity';

export interface FooterGlassProps {
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
// In flow: the content above fades out into the page.
const EDGE_OPACITIES = [0, 0.35, 0.7, 1];
const EDGE_LOCATIONS = [0, 0.3, 0.7, 1];
// Overlay: content stays faintly visible behind the buttons, darkening downward.
const OVERLAY_OPACITIES = [0, 0.55, 0.8, 0.95];
const OVERLAY_LOCATIONS = [0, 0.3, 0.65, 1];

const styles = StyleSheet.create({
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

/**
 * A footer without a fill, like the iOS 26 scroll edge. In flow it fades the
 * content above into the page; as an overlay the content scrolls behind it.
 */
const FooterGlass = ({
  children,
  isOverlay = false,
  includesBottomInset = false,
  onLayout,
  style,
  testID,
}: FooterGlassProps) => {
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
        isOverlay && styles.overlay,
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
        style={isOverlay ? styles.overlayFade : styles.edgeFade}
        testID={testID ? `${testID}-fade` : undefined}
      />
      {children}
    </View>
  );
};

export default FooterGlass;
