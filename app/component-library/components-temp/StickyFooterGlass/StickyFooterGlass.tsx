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
import { HeaderGlassBackdrop } from '../HeaderGlass';

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
});

/**
 * A footer without a fill, like the iOS 26 scroll edge. In flow it fades the
 * content above into the page; as an overlay the content scrolls behind it,
 * under the same blur and gradient as the glass headers.
 */
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
  const fadeColors = useMemo(
    () =>
      EDGE_OPACITIES.map((opacity) =>
        colorWithOpacity(colors.background.default, opacity),
      ),
    [colors.background.default],
  );
  const fadeTestID = testID ? `${testID}-fade` : undefined;

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
      {isOverlay ? (
        // The header's backdrop, mirrored: content scrolls under it.
        <HeaderGlassBackdrop edge="bottom" testID={fadeTestID} />
      ) : (
        <LinearGradient
          pointerEvents="none"
          colors={fadeColors}
          locations={EDGE_LOCATIONS}
          style={footerStyles.edgeFade}
          testID={fadeTestID}
        />
      )}
      {children}
    </View>
  );
};

StickyFooterGlass.displayName = 'StickyFooterGlass';

export default StickyFooterGlass;
