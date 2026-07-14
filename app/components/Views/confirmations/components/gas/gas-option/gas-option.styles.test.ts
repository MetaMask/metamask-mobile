import { brandColor, darkTheme } from '@metamask/design-tokens';
import { AppThemeKey, Theme } from '../../../../../../util/theme/models';

let mockIsPureBlackEnabled = false;

jest.mock('../../../../../../util/theme/themeUtils', () => ({
  get isPureBlackEnabled() {
    return mockIsPureBlackEnabled;
  },
}));

import styleSheet from './gas-option.styles';

const darkThemeModel: Theme = {
  colors: darkTheme.colors,
  themeAppearance: AppThemeKey.dark,
  typography: darkTheme.typography,
  shadows: darkTheme.shadows,
  brandColors: brandColor,
};

describe('gas-option.styles', () => {
  beforeEach(() => {
    mockIsPureBlackEnabled = false;
  });

  it('applies primary.muted background for selected rows when pure black preview is off', () => {
    const styles = styleSheet({ theme: darkThemeModel });

    expect(styles.selectedOption.backgroundColor).toBe(
      darkThemeModel.colors.primary.muted,
    );
  });

  it('omits selected row background in pure black dark mode', () => {
    mockIsPureBlackEnabled = true;

    const styles = styleSheet({ theme: darkThemeModel });

    expect(styles.selectedOption.backgroundColor).toBeUndefined();
  });
});
