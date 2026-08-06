import { brandColor, darkTheme } from '@metamask/design-tokens';
import {
  AppThemeKey,
  Theme,
} from '../../../../../../../../../util/theme/models';

import styleSheet from './value-display.styles';

const darkThemeModel: Theme = {
  colors: darkTheme.colors,
  themeAppearance: AppThemeKey.dark,
  typography: darkTheme.typography,
  shadows: darkTheme.shadows,
  brandColors: brandColor,
};

describe('value-display.styles', () => {
  it('uses bg-default background without border outside pure black mode', () => {
    const styles = styleSheet(darkThemeModel, false);

    expect(styles.valueModal.backgroundColor).toBe(
      darkThemeModel.colors.background.default,
    );
    expect(styles.valueModal.borderWidth).toBe(0);
    expect(styles.valueModal.borderColor).toBeUndefined();
  });

  it('uses bg-alternative background and muted border in pure black mode', () => {
    const styles = styleSheet(darkThemeModel, true);

    expect(styles.valueModal.backgroundColor).toBe(
      darkThemeModel.colors.background.alternative,
    );
    expect(styles.valueModal.borderWidth).toBe(1);
    expect(styles.valueModal.borderBottomWidth).toBe(0);
    expect(styles.valueModal.borderColor).toBe(
      darkThemeModel.colors.border.muted,
    );
  });
});
