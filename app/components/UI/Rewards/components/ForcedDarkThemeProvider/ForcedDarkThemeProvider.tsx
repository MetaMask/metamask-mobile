import React, { useEffect } from 'react';
import { Appearance, StatusBar } from 'react-native';
import { useSelector } from 'react-redux';
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
  const appTheme: AppThemeKey = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.user.appTheme,
  );

  useEffect(() => {
    StatusBar.setBarStyle('light-content', true);
    if (Device.isAndroid()) {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
    }
    return () => {
      // The root ThemeProvider's useAppTheme() only re-runs when the user's
      // app-theme setting or OS color scheme changes — not on navigation —
      // so we must restore the status bar ourselves when leaving the VIP flow.
      const resolved =
        appTheme === AppThemeKey.os ? Appearance.getColorScheme() : appTheme;
      const isDark = resolved === AppThemeKey.dark;
      StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
      if (Device.isAndroid()) {
        StatusBar.setTranslucent(true);
        StatusBar.setBackgroundColor('transparent');
      }
    };
  }, [appTheme]);

  return (
    <ThemeContext.Provider value={forcedDarkTheme}>
      <DesignSystemThemeProvider theme={DesignSystemTheme.Dark}>
        {children}
      </DesignSystemThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ForcedDarkThemeProvider;
