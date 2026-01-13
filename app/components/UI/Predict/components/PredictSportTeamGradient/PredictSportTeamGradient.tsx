import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface PredictSportTeamGradientProps {
  awayColor: string;
  homeColor: string;
  borderRadius?: number;
  style?: ViewStyle;
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
    const hex = trimmedColor.substring(1, 7);
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
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

  // Fallback: return color as-is (might be named color or invalid)
  // This prevents crashes but won't apply opacity
  return trimmedColor;
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

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
  // Apply 20% opacity to both team colors
  const gradientColors = React.useMemo(
    () => [colorWithOpacity(awayColor, 0.2), colorWithOpacity(homeColor, 0.2)],
    [awayColor, homeColor],
  );

  const containerStyle = React.useMemo(
    () => [
      styles.container,
      borderRadius !== undefined && {
        borderRadius,
        overflow: 'hidden' as const,
      },
      style,
    ],
    [borderRadius, style],
  );

  const gradientStyle = React.useMemo(
    () => [styles.gradient, borderRadius !== undefined && { borderRadius }],
    [borderRadius],
  );

  return (
    <View style={containerStyle} testID={testID}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={gradientStyle}
      />
      {children}
    </View>
  );
};

export default PredictSportTeamGradient;
