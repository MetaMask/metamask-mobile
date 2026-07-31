import { brandColor, darkTheme, lightTheme } from '@metamask/design-tokens';
import { AppThemeKey } from '../../../../util/theme/models';
import { createStyles } from './index';

let mockIsPureBlackEnabled = false;

jest.mock('../../../../util/theme/pureBlackPreview', () => ({
  get isPureBlackEnabled() {
    return mockIsPureBlackEnabled;
  },
}));

const createTheme = (themeAppearance) => {
  const base = themeAppearance === AppThemeKey.dark ? darkTheme : lightTheme;

  return {
    colors: base.colors,
    themeAppearance,
    typography: base.typography,
    shadows: base.shadows,
    brandColors: brandColor,
  };
};

describe('ActionContent styles', () => {
  beforeEach(() => {
    mockIsPureBlackEnabled = false;
  });

  it('uses default background without pure black border', () => {
    const theme = createTheme(AppThemeKey.dark);
    const styles = createStyles(theme, false);

    expect(styles.viewContainer.backgroundColor).toBe(
      theme.colors.background.default,
    );
    expect(styles.viewContainer.borderWidth).toBe(0);
    expect(styles.viewContainer.borderColor).toBeUndefined();
  });

  it('uses alternative background and muted border in pure black dark mode', () => {
    mockIsPureBlackEnabled = true;
    const theme = createTheme(AppThemeKey.dark);
    const styles = createStyles(theme, true);

    expect(styles.viewContainer.backgroundColor).toBe(
      theme.colors.background.alternative,
    );
    expect(styles.viewContainer.borderWidth).toBe(1);
    expect(styles.viewContainer.borderColor).toBe(theme.colors.border.muted);
  });

  it('keeps default background in pure black light mode', () => {
    mockIsPureBlackEnabled = true;
    const theme = createTheme(AppThemeKey.light);
    const styles = createStyles(theme, false);

    expect(styles.viewContainer.backgroundColor).toBe(
      theme.colors.background.default,
    );
    expect(styles.viewContainer.borderWidth).toBe(0);
    expect(styles.viewContainer.borderColor).toBeUndefined();
  });
});
