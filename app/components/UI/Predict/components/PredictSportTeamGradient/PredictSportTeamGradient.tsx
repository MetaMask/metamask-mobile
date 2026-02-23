import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { colorWithOpacity } from '../../../../../util/colors';

interface PredictSportTeamGradientProps {
  awayColor: string;
  homeColor: string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  testID?: string;
}

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
