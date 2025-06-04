// Third party dependencies
import React from 'react';

// External dependencies
import {
  ThemeProvider as TwrncThemeProvider,
  Theme as TwrncTheme,
} from '@metamask-previews/design-system-twrnc-preset';
import { useAppTheme } from '../../../util/theme';
import { AppThemeKey } from '../../../util/theme/models';

interface TwrncThemeProviderProps {
  children: React.ReactNode;
}

const EnhancedTwrncThemeProvider: React.FC<TwrncThemeProviderProps> = ({
  children,
}) => {
  const { themeAppearance } = useAppTheme();

  // Map MetaMask theme to TWRNC theme
  const getTwrncTheme = (appearance: AppThemeKey): TwrncTheme => {
    switch (appearance) {
      case AppThemeKey.dark:
        return TwrncTheme.Dark;
      case AppThemeKey.light:
        return TwrncTheme.Light;
      case AppThemeKey.os:
      default:
        return TwrncTheme.Default;
    }
  };

  const twrncTheme = getTwrncTheme(themeAppearance);

  return <TwrncThemeProvider theme={twrncTheme}>{children}</TwrncThemeProvider>;
};

export default EnhancedTwrncThemeProvider;
