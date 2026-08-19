import { useLayoutEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): Icon Lab is the temporary icon-set host */
import {
  applyIconSet,
  retainPhosphorRegular,
  releasePhosphorRegular,
} from '../../Settings/IconLab/IconSetOverride';
/* eslint-enable import-x/no-restricted-paths */

/**
 * While the host screen is focused, redirect DS and component-library `Icon`
 * assets to Phosphor Regular. Restores the design-system set when the last
 * host blurs so other screens keep their original glyphs.
 *
 * Apply during render (not only in an effect) so child `Icon`s look up the
 * Phosphor assets on the first paint.
 */
export const useHomepagePhosphorBoldIcons = (): void => {
  const isFocused = useIsFocused();

  if (isFocused) {
    applyIconSet('phosphor', 'regular');
  }

  useLayoutEffect(() => {
    if (!isFocused) {
      return;
    }

    retainPhosphorRegular();

    return () => {
      releasePhosphorRegular();
    };
  }, [isFocused]);
};
