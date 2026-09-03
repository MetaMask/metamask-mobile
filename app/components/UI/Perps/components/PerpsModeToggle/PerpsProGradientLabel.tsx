import MaskedView from '@react-native-masked-view/masked-view';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

/**
 * Perps "Pro" accent gradient from Figma (`accent/02/light` → `accent/02/normal`).
 * Vertical top→bottom matches the Lite/Pro segmented control (node 10198:20239).
 */
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
export const PERPS_PRO_GRADIENT = ['#eac2ff', '#d075ff'] as const;
/** Solid fallback / mask color — `accent/02/normal`. */
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
export const PERPS_PRO_ACCENT_COLOR = '#d075ff';

/**
 * Body/Sm/Medium sizing so the gradient label matches FilterButton / ButtonBase
 * Sm text in the design-system segmented control.
 */
const labelStyle = StyleSheet.create({
  text: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    // Visible only as the MaskedView mask; solid color is a fallback.
    color: PERPS_PRO_ACCENT_COLOR,
  },
  gradientFill: {
    alignItems: 'center',
  },
  transparent: {
    opacity: 0,
  },
});

interface PerpsProGradientLabelProps {
  children: string;
}

/**
 * Renders the "Pro" label with the Figma accent gradient (TAT-3551).
 *
 * Passed as non-string children into design-system buttons so TextOrChildren
 * renders it as-is instead of wrapping it in a solid-colored Text.
 */
const PerpsProGradientLabel: React.FC<PerpsProGradientLabelProps> = ({
  children,
}) => (
  <MaskedView maskElement={<Text style={labelStyle.text}>{children}</Text>}>
    <LinearGradient
      colors={[...PERPS_PRO_GRADIENT]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={labelStyle.gradientFill}
    >
      <Text style={[labelStyle.text, labelStyle.transparent]}>{children}</Text>
    </LinearGradient>
  </MaskedView>
);

export default PerpsProGradientLabel;
