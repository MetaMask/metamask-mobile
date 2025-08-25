// Third party dependencies
import React from 'react';

// External dependencies
import { useAppTheme, ThemeContext } from '../../../util/theme';
import {
  ThemeProvider as DesignSystemThemeProvider,
  Theme,
} from '@metamask/design-system-twrnc-preset';
import { AppThemeKey } from '../../../util/theme/models';

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const theme = useAppTheme();

  // Convert app theme appearance to design system theme
  const designSystemTheme =
    theme.themeAppearance === AppThemeKey.dark ? Theme.Dark : Theme.Light;

  return (
    <ThemeContext.Provider value={theme}>
      <DesignSystemThemeProvider theme={designSystemTheme}>
        {children}
      </DesignSystemThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
