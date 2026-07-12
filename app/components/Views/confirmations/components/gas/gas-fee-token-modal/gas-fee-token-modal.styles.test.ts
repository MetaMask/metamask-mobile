import { brandColor, darkTheme } from '@metamask/design-tokens';
import { AppThemeKey, Theme } from '../../../../../../util/theme/models';

const MOCK_ELEVATED_SURFACE_COLOR = 'mock-elevated-surface-color';

jest.mock('../../../../../../util/theme/themeUtils', () => ({
  getElevatedSurfaceColor: jest.fn(() => MOCK_ELEVATED_SURFACE_COLOR),
}));

import styleSheet from './gas-fee-token-modal.styles';

const darkThemeModel: Theme = {
  colors: darkTheme.colors,
  themeAppearance: AppThemeKey.dark,
  typography: darkTheme.typography,
  shadows: darkTheme.shadows,
  brandColors: brandColor,
};

describe('gas-fee-token-modal.styles', () => {
  it('uses elevated surface color for the modal container', () => {
    const styles = styleSheet({
      theme: darkThemeModel,
      vars: {},
    });

    expect(styles.modalContainer.backgroundColor).toBe(
      MOCK_ELEVATED_SURFACE_COLOR,
    );
  });
});
