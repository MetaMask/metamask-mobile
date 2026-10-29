import { colors as importedColors } from '../../../styles/common';
import { AppThemeKey } from '../../../util/theme/models';

/**
 * Light-mode canvas for welcome, login, and OAuth rehydration.
 * Dark mode uses the normal theme background, matching those screens.
 */
export const getOnboardingCanvasColor = (
  themeAppearance: AppThemeKey.light | AppThemeKey.dark,
  backgroundDefault: string,
): string =>
  themeAppearance === AppThemeKey.dark
    ? backgroundDefault
    : importedColors.gettingStartedPageBackgroundColorLightMode;
