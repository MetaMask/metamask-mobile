import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface PredictSportTeamGradientProps {
  awayColor: string;
  homeColor: string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  testID?: string;
}

/**
 * Converts any color format to RGBA with specified opacity.
 * Handles: 6-char hex, 8-char hex, 3-char hex, RGB, RGBA
 */
const colorWithOpacity = (color: string, opacity: number): string => {
  const trimmedColor = color.trim();

  // Handle 6-character hex: #RRGGBB
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmedColor)) {
    const hex = trimmedColor.substring(1);
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  // Handle 8-character hex with alpha: #RRGGBBAA (replace alpha with new opacity)
  if (/^#[0-9A-Fa-f]{8}$/.test(trimmedColor)) {
    const hex = trimmedColor.substring(1);
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Correctly parse alpha from bytes 7-8 (even though we replace it with opacity)
    // const alpha = parseInt(hex.substring(6, 8), 16) / 255;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  // Handle 3-character hex: #RGB → #RRGGBB
  if (/^#[0-9A-Fa-f]{3}$/.test(trimmedColor)) {
    const r = trimmedColor[1];
    const g = trimmedColor[2];
    const b = trimmedColor[3];
    const expandedHex = `${r}${r}${g}${g}${b}${b}`;
    const rInt = parseInt(expandedHex.substring(0, 2), 16);
    const gInt = parseInt(expandedHex.substring(2, 4), 16);
    const bInt = parseInt(expandedHex.substring(4, 6), 16);
    return `rgba(${rInt}, ${gInt}, ${bInt}, ${opacity})`;
  }

  // Handle 4-character hex with alpha: #RGBA
  if (/^#[0-9A-Fa-f]{4}$/.test(trimmedColor)) {
    const r = trimmedColor[1];
    const g = trimmedColor[2];
    const b = trimmedColor[3];
    // Alpha nibble at position 4 (correctly parsed but replaced with opacity)
    // const a = trimmedColor[4];
    // const alpha = parseInt(a + a, 16) / 255;
    const expandedHex = `${r}${r}${g}${g}${b}${b}`;
    const rInt = parseInt(expandedHex.substring(0, 2), 16);
    const gInt = parseInt(expandedHex.substring(2, 4), 16);
    const bInt = parseInt(expandedHex.substring(4, 6), 16);
    return `rgba(${rInt}, ${gInt}, ${bInt}, ${opacity})`;
  }

  // Handle rgb(r, g, b) format
  const rgbMatch = trimmedColor.match(
    /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i,
  );
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${opacity})`;
  }

  // Handle rgba(r, g, b, a) format (replace alpha with new opacity)
  const rgbaMatch = trimmedColor.match(
    /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)$/i,
  );
  if (rgbaMatch) {
    return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${opacity})`;
  }

  // Fallback: validate color format before returning
  // Invalid colors can crash LinearGradient native rendering
  const isRecognizedFormat = /^(#[0-9A-Fa-f]{3,8}|rgba?\(.*\))$/i.test(
    trimmedColor,
  );
  if (!isRecognizedFormat) {
    if (__DEV__) {
      console.warn(
        `[PredictSportTeamGradient] Invalid color format: "${trimmedColor}". Using transparent fallback.`,
      );
    }
    return 'rgba(0, 0, 0, 0)';
  }
  // Return as-is for recognized formats (e.g., named colors like 'red', 'blue')
  return trimmedColor;
};

/**
 * Simple 45° linear gradient overlay with both team colors at 20% opacity.
 *
 * NO THEME AWARENESS NEEDED - this is just an overlay.
 * The design system handles dark/light backgrounds automatically.
 *
 * Self-contained component that wraps children with a gradient background.
 * No need to set position: 'relative' on parent - it's handled internally.
 *
 * Used in NFL game cards to display team colors as a subtle background.
 *
 * Supports multiple color formats:
 * - 6-char hex: #FF0000
 * - 8-char hex with alpha: #FF0000FF (alpha ignored, replaced with 20%)
 * - 3-char hex: #F00
 * - 4-char hex with alpha: #F00F (alpha ignored)
 * - RGB: rgb(255, 0, 0)
 * - RGBA: rgba(255, 0, 0, 0.5) (alpha ignored)
 *
 * @param borderRadius - Optional border radius to clip gradient (e.g., 16 for card containers)
 */
const PredictSportTeamGradient: React.FC<PredictSportTeamGradientProps> = ({
  awayColor,
  homeColor,
  borderRadius,
  style,
  children,
  testID,
}) => {
  const tw = useTailwind();

  // Apply 20% opacity to both team colors
  const gradientColors = React.useMemo(
    () => [colorWithOpacity(awayColor, 0.2), colorWithOpacity(homeColor, 0.2)],
    [awayColor, homeColor],
  );

  const containerStyle = React.useMemo(() => {
    const flattenedStyle = StyleSheet.flatten(style);
    // Check if borderRadius is provided via prop or style
    const hasBorderRadius =
      borderRadius !== undefined ||
      (flattenedStyle && 'borderRadius' in flattenedStyle);

    const baseStyle = tw.style(
      'relative',
      hasBorderRadius && 'overflow-hidden',
      borderRadius !== undefined && { borderRadius },
    );

    // Type assertions needed due to StyleSheet.flatten type incompatibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return StyleSheet.flatten([baseStyle, flattenedStyle] as any) as any;
  }, [tw, borderRadius, style]);

  return (
    // Type assertion needed due to Box component type incompatibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Box style={containerStyle as any} testID={testID}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={tw.style(
          'absolute inset-0',
          borderRadius !== undefined && { borderRadius },
        )}
        testID={testID ? `${testID}-gradient` : undefined}
      />
      {children}
    </Box>
  );
};

export default PredictSportTeamGradient;
