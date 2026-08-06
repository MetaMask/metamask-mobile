import { brandColor, darkTheme } from '@metamask/design-tokens';
import { AppThemeKey, Theme } from '../../../../../../util/theme/models';

import styleSheet from './estimates-modal.styles';

const darkThemeModel: Theme = {
  colors: darkTheme.colors,
  themeAppearance: AppThemeKey.dark,
  typography: darkTheme.typography,
  shadows: darkTheme.shadows,
  brandColors: brandColor,
};

describe('estimates-modal.styles', () => {
  it('uses default background without pure black border', () => {
    const styles = styleSheet({
      theme: darkThemeModel,
      vars: { isPureBlack: false },
    });

    expect(styles.container.backgroundColor).toBe(
      darkThemeModel.colors.background.default,
    );
    expect(styles.container.borderWidth).toBe(0);
    expect(styles.container.borderColor).toBeUndefined();
  });

  it('uses alternative background and muted border in pure black mode', () => {
    const styles = styleSheet({
      theme: darkThemeModel,
      vars: { isPureBlack: true },
    });

    expect(styles.container.backgroundColor).toBe(
      darkThemeModel.colors.background.alternative,
    );
    expect(styles.container.borderWidth).toBe(1);
    expect(styles.container.borderColor).toBe(
      darkThemeModel.colors.border.muted,
    );
  });
});
