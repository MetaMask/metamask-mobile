import type { Colors } from '../../../util/theme/models';

import type { PressableVariant } from './Pressable.types';

interface ColorPair {
  resting: string | undefined;
  pressed: string | undefined;
}

/**
 * Resolves the resting + pressed background colors for a variant against
 * the current theme. Returning `undefined` means "no color applied" so
 * the underlying view stays transparent.
 */
export const getVariantColors = (
  variant: PressableVariant,
  colors: Colors,
): ColorPair => {
  switch (variant) {
    case 'section':
      return {
        resting: colors.background.section,
        pressed: colors.background.defaultPressed,
      };
    case 'subsection':
      return {
        resting: colors.background.subsection,
        pressed: colors.background.defaultPressed,
      };
    case 'default':
      return {
        resting: colors.background.default,
        pressed: colors.background.defaultPressed,
      };
    case 'muted':
      return {
        resting: colors.background.muted,
        pressed: colors.background.mutedPressed,
      };
    case 'transparent':
      return {
        resting: undefined,
        pressed: colors.background.defaultPressed,
      };
    case 'none':
    default:
      return { resting: undefined, pressed: undefined };
  }
};
