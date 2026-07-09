import { brandColor, darkTheme, lightTheme } from '@metamask/design-tokens';
import { AppThemeKey, Theme } from '../../../../../util/theme/models';
import { createSwapsKeypadStyles } from './styles';

let mockIsPureBlackEnabled = false;

jest.mock('../../../../../util/theme/themeUtils', () => ({
  get isPureBlackEnabled() {
    return mockIsPureBlackEnabled;
  },
  getElevatedSurfaceColor: (theme: {
    colors: { background: { default: string; alternative: string } };
    themeAppearance: string;
  }) => {
    if (!mockIsPureBlackEnabled) return theme.colors.background.default;
    return theme.themeAppearance === 'dark'
      ? theme.colors.background.alternative
      : theme.colors.background.default;
  },
}));

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

describe('createSwapsKeypadStyles', () => {
  beforeEach(() => {
    mockIsPureBlackEnabled = false;
  });

  it('uses border-bottom workaround when pure black is disabled', () => {
    const theme = createTheme(AppThemeKey.dark);
    const styles = createSwapsKeypadStyles(theme);

    expect(styles.keypadDialog.backgroundColor).toBeUndefined();
    expect(styles.keypadDialog.borderColor).toBeUndefined();
    expect(styles.keypadDialog.borderBottomColor).toBe(
      theme.colors.background.default,
    );
  });

  it('uses elevated surface colors for keypad dialog in pure black dark mode', () => {
    mockIsPureBlackEnabled = true;
    const theme = createTheme(AppThemeKey.dark);
    const styles = createSwapsKeypadStyles(theme);

    expect(styles.keypadDialog.backgroundColor).toBe(
      theme.colors.background.alternative,
    );
    expect(styles.keypadDialog.borderColor).toBe(theme.colors.border.muted);
    expect(styles.keypadDialog.borderBottomColor).toBeUndefined();
  });

  it('does not override keypad dialog surface in pure black light mode', () => {
    mockIsPureBlackEnabled = true;
    const theme = createTheme(AppThemeKey.light);
    const styles = createSwapsKeypadStyles(theme);

    expect(styles.keypadDialog.backgroundColor).toBeUndefined();
    expect(styles.keypadDialog.borderColor).toBeUndefined();
    expect(styles.keypadDialog.borderBottomColor).toBe(
      theme.colors.background.default,
    );
  });
});
