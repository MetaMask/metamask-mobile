import { Platform, type ColorValue, type ViewStyle } from 'react-native';

/**
 * Shared amount-cursor style for a line box equal to `fontSize`.
 * Android draws glyphs lower in that box than iOS, so the offset flips direction.
 */
export const getAmountCursorStyle = (
  fontSize: number,
  color: ColorValue,
): ViewStyle => ({
  width: 1,
  backgroundColor: color,
  height: Math.round(fontSize * 0.95),
  transform: [
    {
      translateY: Math.round(
        fontSize * (Platform.OS === 'android' ? 0.02 : -0.04),
      ),
    },
  ],
});
