import { brandColor, darkTheme } from '@metamask/design-tokens';
import { AppThemeKey, Theme } from '../../../../../util/theme/models';

const MOCK_ELEVATED_SURFACE_COLOR = 'mock-elevated-surface-color';

jest.mock('../../../../../util/theme/themeUtils', () => ({
  getElevatedSurfaceColor: jest.fn(() => MOCK_ELEVATED_SURFACE_COLOR),
}));

import styleSheet from './confirm-component.styles';

const darkThemeModel: Theme = {
  colors: darkTheme.colors,
  themeAppearance: AppThemeKey.dark,
  typography: darkTheme.typography,
  shadows: darkTheme.shadows,
  brandColors: brandColor,
};

describe('confirm-component.styles', () => {
  it('uses elevated surface color for the full-screen flat container', () => {
    const styles = styleSheet({
      theme: darkThemeModel,
      vars: { isFullScreenConfirmation: true },
    });

    expect(styles.flatContainer.backgroundColor).toBe(
      MOCK_ELEVATED_SURFACE_COLOR,
    );
  });

  it('uses elevated surface color for the default loader spinner container', () => {
    const styles = styleSheet({
      theme: darkThemeModel,
      vars: { isFullScreenConfirmation: true },
    });

    expect(styles.spinnerContainer.backgroundColor).toBe(
      MOCK_ELEVATED_SURFACE_COLOR,
    );
  });
});
