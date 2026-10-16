import React, { useMemo } from 'react';
import {
  Box,
  BoxFlexDirection,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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
import ButtonGlass, {
  type ButtonGlassProps,
  type ButtonGlassVariant,
} from '../ButtonGlass';

export type FooterGlassButtonProps = Omit<ButtonGlassProps, 'variant'>;

export interface FooterGlassProps {
  /** Children rendered inside the gradient footer container. */
  children?: React.ReactNode;
  /** Top button. Rendered as `ButtonVariant.Primary`. */
  primaryButtonProps?: FooterGlassButtonProps;
  /** Middle button. Rendered as `ButtonVariant.Secondary`. */
  secondaryButtonProps?: FooterGlassButtonProps;
  /** Bottom button. Rendered as `ButtonVariant.Tertiary`. */
  tertiaryButtonProps?: FooterGlassButtonProps;
  /** Tailwind classes merged onto the button-stack footer container. */
  twClassName?: string;
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

/**
 * Renders either the reusable vertical button stack or a gradient footer
 * container. The two forms share this component while the design-system
 * footer API is still temporary.
 */
const FooterGlass = ({
  children,
  primaryButtonProps,
  secondaryButtonProps,
  tertiaryButtonProps,
  twClassName,
  isOverlay = false,
  includesBottomInset = false,
  onLayout,
  style,
  testID,
}: FooterGlassProps) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();

  const hasButtonStack =
    primaryButtonProps || secondaryButtonProps || tertiaryButtonProps;

  const opacities = isOverlay ? OVERLAY_OPACITIES : EDGE_OPACITIES;
  const fadeColors = useMemo(
    () =>
      opacities.map((opacity) =>
        colorWithOpacity(colors.background.default, opacity),
      ),
    [colors.background.default, opacities],
  );

  if (children !== undefined) {
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
  }

  if (!hasButtonStack) {
    return null;
  }

  const renderButton = (
    buttonProps: FooterGlassButtonProps,
    variant: ButtonGlassVariant,
  ) => (
    <ButtonGlass
      {...buttonProps}
      variant={variant}
      isFullWidth
      containerStyle={[tw.style('self-stretch'), buttonProps.containerStyle]}
      style={[tw.style('self-stretch'), buttonProps.style]}
    />
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      gap={4}
      twClassName={['px-4', twClassName].filter(Boolean).join(' ')}
      testID={testID}
    >
      {primaryButtonProps &&
        renderButton(primaryButtonProps, ButtonVariant.Primary)}
      {secondaryButtonProps &&
        renderButton(secondaryButtonProps, ButtonVariant.Secondary)}
      {tertiaryButtonProps &&
        renderButton(tertiaryButtonProps, ButtonVariant.Tertiary)}
    </Box>
  );
};

FooterGlass.displayName = 'FooterGlass';

export default FooterGlass;
