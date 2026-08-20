import { useLayoutEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): Icon Lab is the temporary icon-set host */
import {
  applyIconSet,
  HOMEPAGE_LUCIDE_STROKE_WIDTH,
  retainLucide,
  releaseLucide,
} from '../../Settings/IconLab/IconSetOverride';
/* eslint-enable import-x/no-restricted-paths */

const HOMEPAGE_LUCIDE_OPTIONS = {
  strokeWidth: HOMEPAGE_LUCIDE_STROKE_WIDTH,
  absoluteStrokeWidth: false,
} as const;

/**
 * While the host screen is focused, redirect DS and component-library `Icon`
 * assets to Lucide at 1.5 stroke. Restores the design-system set when the last
 * host blurs so other screens keep their original glyphs.
 *
 * Apply during render (not only in an effect) so child `Icon`s look up the
 * Lucide assets on the first paint.
 */
export const useHomepageLucideIcons = (): void => {
  const isFocused = useIsFocused();

  if (isFocused) {
    applyIconSet('lucide', 'regular', undefined, HOMEPAGE_LUCIDE_OPTIONS);
  }

  useLayoutEffect(() => {
    if (!isFocused) {
      return;
    }

    retainLucide();

    return () => {
      releaseLucide();
    };
  }, [isFocused]);
};
