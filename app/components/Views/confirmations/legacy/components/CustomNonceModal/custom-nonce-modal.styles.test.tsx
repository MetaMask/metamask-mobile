/**
 * Style coverage for CustomNonceModal Pure Black stopgaps (TMCU-1017).
 * Remove this file during the pure black cleanup or when CustomNonceModal
 * migrates to MMDS BottomSheet and no longer owns local StyleSheet logic.
 */
import { brandColor, darkTheme, lightTheme } from '@metamask/design-tokens';
import { AppThemeKey } from '../../../../../../util/theme/models';
import { createStyles } from './index';

let mockIsPureBlackEnabled = false;

jest.mock('../../../../../../util/theme/pureBlackPreview', () => ({
  get isPureBlackEnabled() {
    return mockIsPureBlackEnabled;
  },
}));

const createTheme = (themeAppearance: AppThemeKey.light | AppThemeKey.dark) => {
  const base = themeAppearance === AppThemeKey.dark ? darkTheme : lightTheme;

  return {
    colors: base.colors,
    themeAppearance,
    typography: base.typography,
    shadows: base.shadows,
    brandColors: brandColor,
  };
};

describe('CustomNonceModal styles', () => {
  beforeEach(() => {
    mockIsPureBlackEnabled = false;
  });

  describe('modal container', () => {
    it('uses default background without pure black borders', () => {
      const theme = createTheme(AppThemeKey.dark);
      const styles = createStyles(theme);

      expect(styles.modal.backgroundColor).toBe(
        theme.colors.background.default,
      );
      expect(styles.modal.borderTopWidth).toBeUndefined();
      expect(styles.modal.borderColor).toBeUndefined();
    });

    it('uses elevated surface and muted borders in pure black dark mode', () => {
      mockIsPureBlackEnabled = true;
      const theme = createTheme(AppThemeKey.dark);
      const styles = createStyles(theme);

      expect(styles.modal.backgroundColor).toBe(
        theme.colors.background.alternative,
      );
      expect(styles.modal.borderTopWidth).toBe(1);
      expect(styles.modal.borderLeftWidth).toBe(1);
      expect(styles.modal.borderRightWidth).toBe(1);
      expect(styles.modal.borderColor).toBe(theme.colors.border.muted);
    });

    it('keeps default background in pure black light mode', () => {
      mockIsPureBlackEnabled = true;
      const theme = createTheme(AppThemeKey.light);
      const styles = createStyles(theme);

      expect(styles.modal.backgroundColor).toBe(
        theme.colors.background.default,
      );
      expect(styles.modal.borderTopWidth).toBeUndefined();
    });
  });

  describe('nonce warning', () => {
    it('uses muted warning fill when pure black preview is off', () => {
      const theme = createTheme(AppThemeKey.dark);
      const styles = createStyles(theme);

      expect(styles.nonceWarning.backgroundColor).toBe(
        theme.colors.warning.muted,
      );
      expect(styles.nonceWarning.borderColor).toBe(
        theme.colors.warning.default,
      );
    });

    it('omits muted warning fill in pure black mode', () => {
      mockIsPureBlackEnabled = true;
      const theme = createTheme(AppThemeKey.dark);
      const styles = createStyles(theme);

      expect(styles.nonceWarning.backgroundColor).toBeUndefined();
      expect(styles.nonceWarning.borderColor).toBe(
        theme.colors.warning.default,
      );
    });
  });
});
