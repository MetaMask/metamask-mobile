import { useMemo } from 'react';
import { Platform, type ViewStyle } from 'react-native';

import { useTheme } from '../../../util/theme';

/**
 * Shared amount-cursor style for a line box equal to `fontSize`.
 * The cursor uses the muted text color. Android draws glyphs lower in that
 * box than iOS, so the offset flips direction.
 */
export const useAmountCursorStyle = (fontSize: number): ViewStyle => {
  const { colors } = useTheme();

  return useMemo(
    () => ({
      width: 1,
      backgroundColor: colors.text.muted,
      height: Math.round(fontSize * 0.95),
      transform: [
        {
          translateY: Math.round(
            fontSize * (Platform.OS === 'android' ? 0.02 : -0.04),
          ),
        },
      ],
    }),
    [colors.text.muted, fontSize],
  );
};
