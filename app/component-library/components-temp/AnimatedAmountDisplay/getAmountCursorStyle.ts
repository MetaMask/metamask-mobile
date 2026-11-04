import { Platform, type ViewStyle } from 'react-native';

/**
 * Size and vertical offset for an amount cursor whose line box equals `fontSize`.
 * Android draws glyphs lower in that box than iOS, so the offset flips direction.
 */
export const getAmountCursorStyle = (fontSize: number): ViewStyle => ({
  height: Math.round(fontSize * 0.95),
  transform: [
    {
      translateY: Math.round(
        fontSize * (Platform.OS === 'android' ? 0.02 : -0.04),
      ),
    },
  ],
});
