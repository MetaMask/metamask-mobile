import MaskedView from '@react-native-masked-view/masked-view';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../../../../util/theme';

/**
 * Body/Sm/Medium sizing so the gradient label matches FilterButton / ButtonBase
 * Sm text in the design-system segmented control.
 */
const labelStyle = StyleSheet.create({
  text: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
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
 * Renders the "Pro" label with the Figma accent/02 gradient (TAT-3640).
 *
 * Colors come from the shared `accent02` design tokens (`light` → `normal`,
 * vertical top→bottom), matching the Lite/Pro segmented control.
 *
 * Passed as non-string children into design-system buttons so TextOrChildren
 * renders it as-is instead of wrapping it in a solid-colored Text.
 */
const PerpsProGradientLabel: React.FC<PerpsProGradientLabelProps> = ({
  children,
}) => {
  const { colors } = useTheme();
  const gradientColors = [colors.accent02.light, colors.accent02.normal] as [
    string,
    string,
  ];

  return (
    <MaskedView
      maskElement={
        <Text style={[labelStyle.text, { color: colors.accent02.normal }]}>
          {children}
        </Text>
      }
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={labelStyle.gradientFill}
      >
        <Text
          style={[
            labelStyle.text,
            labelStyle.transparent,
            { color: colors.accent02.normal },
          ]}
        >
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
};

export default PerpsProGradientLabel;
