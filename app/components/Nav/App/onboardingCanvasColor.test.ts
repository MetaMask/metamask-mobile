import { colors } from '../../../styles/common';
import { AppThemeKey } from '../../../util/theme/models';
import { getOnboardingCanvasColor } from './onboardingCanvasColor';

describe('getOnboardingCanvasColor', () => {
  it('returns the light-mode onboarding canvas', () => {
    const backgroundDefault = 'theme-background';

    const result = getOnboardingCanvasColor(
      AppThemeKey.light,
      backgroundDefault,
    );

    expect(result).toBe(colors.gettingStartedPageBackgroundColorLightMode);
  });

  it('returns the theme background in dark mode', () => {
    const backgroundDefault = 'theme-background';

    const result = getOnboardingCanvasColor(
      AppThemeKey.dark,
      backgroundDefault,
    );

    expect(result).toBe(backgroundDefault);
  });
});
