import { brandColor, darkTheme, lightTheme } from '@metamask/design-tokens';
import { AppThemeKey, Theme } from '../../../util/theme/models';
import styleSheet from './BaseNotification.styles';

const createTheme = (
  themeAppearance: AppThemeKey.light | AppThemeKey.dark,
): Theme => {
  const base = themeAppearance === AppThemeKey.dark ? darkTheme : lightTheme;

  return {
    colors: base.colors,
    themeAppearance,
    typography: base.typography,
    shadows: base.shadows,
    brandColors: brandColor,
  };
};

describe('BaseNotification.styles', () => {
  it('uses the default background and shadow styles in light mode', () => {
    const theme = createTheme(AppThemeKey.light);

    const styles = styleSheet({ theme });

    expect(styles.base.backgroundColor).toBe(theme.colors.background.default);
    expect(styles.base).toEqual(expect.objectContaining(theme.shadows.size.md));
  });

  it('uses the section background without shadow in dark mode', () => {
    const theme = createTheme(AppThemeKey.dark);

    const styles = styleSheet({ theme });

    expect(styles.base.backgroundColor).toBe(theme.colors.background.section);
    expect(styles.base.shadowColor).toBeUndefined();
  });
});
