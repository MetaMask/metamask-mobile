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
  it('uses elevated surface color for the confirmation bottom sheet', () => {
    const styles = styleSheet({
      theme: darkThemeModel,
      vars: { isFullScreenConfirmation: false },
    });

    expect(styles.bottomSheetDialogSheet.backgroundColor).toBe(
      MOCK_ELEVATED_SURFACE_COLOR,
    );
  });
});
