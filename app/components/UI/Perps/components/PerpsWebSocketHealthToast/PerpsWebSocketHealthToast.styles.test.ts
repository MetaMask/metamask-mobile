import { brandColor, darkTheme, lightTheme } from '@metamask/design-tokens';
import { mockTheme } from '../../../../../util/theme';
import { AppThemeKey, Theme } from '../../../../../util/theme/models';
import styleSheet from './PerpsWebSocketHealthToast.styles';

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

describe('PerpsWebSocketHealthToast.styles', () => {
  describe('toast', () => {
    it('uses default background and medium shadow in light theme', () => {
      const theme = createTheme(AppThemeKey.light);

      const styles = styleSheet({ theme });

      expect(styles.toast.backgroundColor).toBe(
        theme.colors.background.default,
      );
      expect(styles.toast).toMatchObject(theme.shadows.size.md);
    });

    it('uses section background and no shadow in dark theme', () => {
      const theme = createTheme(AppThemeKey.dark);

      const styles = styleSheet({ theme });

      expect(styles.toast.backgroundColor).toBe(
        theme.colors.background.section,
      );
      expect(styles.toast).not.toHaveProperty('shadowColor');
      expect(styles.toast).not.toHaveProperty('shadowOffset');
      expect(styles.toast).not.toHaveProperty('shadowOpacity');
      expect(styles.toast).not.toHaveProperty('shadowRadius');
    });
  });

  describe('container', () => {
    it('positions the toast at the top of the screen', () => {
      const styles = styleSheet({ theme: mockTheme as Theme });

      expect(styles.container).toMatchObject({
        position: 'absolute',
        top: 74,
        left: 12,
        right: 12,
        zIndex: 9999,
      });
    });
  });
});
