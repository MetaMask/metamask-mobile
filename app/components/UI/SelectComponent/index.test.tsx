import React from 'react';
import { brandColor, darkTheme, lightTheme } from '@metamask/design-tokens';
import renderWithProvider from '../../../util/test/renderWithProvider';
import SelectComponent, { createStyles } from './';
import { AppThemeKey, Theme } from '../../../util/theme/models';

let mockIsPureBlackEnabled = false;

jest.mock('../../../util/theme/pureBlackPreview', () => ({
  get isPureBlackEnabled() {
    return mockIsPureBlackEnabled;
  },
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    colors: {},
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

describe('SelectComponent', () => {
  beforeEach(() => {
    mockIsPureBlackEnabled = false;
  });

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <SelectComponent
        options={[
          { key: 'key 1', val: 'val 1', label: 'option 1' },
          { key: 'key 2', val: 'val 2', label: 'option 2' },
        ]}
        selectedValue={'val 2'}
        label={'Choose an option'}
      />,
    );

    expect(toJSON()).not.toBeNull();
  });
});

describe('SelectComponent styles', () => {
  beforeEach(() => {
    mockIsPureBlackEnabled = false;
  });

  it('uses default background without pure black border', () => {
    const theme = createTheme(AppThemeKey.dark);
    const styles = createStyles(theme);

    expect(styles.modalView.backgroundColor).toBe(
      theme.colors.background.default,
    );
    expect(styles.modalView.borderWidth).toBe(0);
    expect(styles.modalView.borderColor).toBeUndefined();
  });

  it('uses alternative background and muted border in pure black dark mode', () => {
    mockIsPureBlackEnabled = true;
    const theme = createTheme(AppThemeKey.dark);
    const styles = createStyles(theme);

    expect(styles.modalView.backgroundColor).toBe(
      theme.colors.background.alternative,
    );
    expect(styles.modalView.borderWidth).toBe(1);
    expect(styles.modalView.borderColor).toBe(theme.colors.border.muted);
  });

  it('keeps default background in pure black light mode', () => {
    mockIsPureBlackEnabled = true;
    const theme = createTheme(AppThemeKey.light);
    const styles = createStyles(theme);

    expect(styles.modalView.backgroundColor).toBe(
      theme.colors.background.default,
    );
    expect(styles.modalView.borderWidth).toBe(0);
    expect(styles.modalView.borderColor).toBeUndefined();
  });
});
