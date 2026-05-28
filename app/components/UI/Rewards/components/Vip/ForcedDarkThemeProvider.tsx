import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { brandColor, darkTheme } from '@metamask/design-tokens';
import {
  ThemeProvider as DesignSystemThemeProvider,
  Theme as DesignSystemTheme,
} from '@metamask/design-system-twrnc-preset';
import { ThemeContext } from '../../../../../util/theme';
import { AppThemeKey, Theme } from '../../../../../util/theme/models';
import Device from '../../../../../util/device';

const forcedDarkTheme: Theme = {
  colors: darkTheme.colors,
  themeAppearance: AppThemeKey.dark,
  typography: darkTheme.typography,
  shadows: darkTheme.shadows,
  brandColors: brandColor,
};

interface ForcedDarkThemeProviderProps {
  children: React.ReactNode;
}

const ForcedDarkThemeProvider: React.FC<ForcedDarkThemeProviderProps> = ({
  children,
}) => {
  useEffect(() => {
    StatusBar.setBarStyle('light-content', true);
    if (Device.isAndroid()) {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
    }
  }, []);

  return (
    <ThemeContext.Provider value={forcedDarkTheme}>
      <DesignSystemThemeProvider theme={DesignSystemTheme.Dark}>
        {children}
      </DesignSystemThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ForcedDarkThemeProvider;
