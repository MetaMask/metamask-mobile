import React, { useContext } from 'react';
import { useColorScheme, StatusBar, ColorSchemeName } from 'react-native';
import { Colors, AppThemeKey, Theme } from './models';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '@metamask/design-tokens';

import Device from '../device';

/**
 * This is needed to make our unit tests pass since Enzyme doesn't support contextType
 * TODO: Convert classes into functional components and remove contextType
 */
export const mockTheme = {
  theme: lightTheme,
  colors: lightTheme.colors,
  themeAppearance: 'light',
  typography: lightTheme.typography,
};

export const ThemeContext = React.createContext<any>(undefined);

/**
 * Utility function for getting asset from theme (Class components)
 *
 * @param appTheme Theme from app
 * @param osColorScheme Theme from OS
 * @param light Light asset
 * @param dark Dark asset
 * @returns
 */
export const getAssetFromTheme = (
  appTheme: AppThemeKey,
  osColorScheme: ColorSchemeName,
  light: any,
  dark: any,
) => {
  let asset = light;
  switch (appTheme) {
    case AppThemeKey.light:
      asset = light;
      break;
    case AppThemeKey.dark:
      asset = dark;
      break;
    case AppThemeKey.os:
      asset = osColorScheme === 'dark' ? dark : light;
      break;
    default:
      asset = light;
  }
  return asset;
};

export const useAppTheme = (): Theme => {
  const osThemeName = useColorScheme();
  const appTheme: AppThemeKey = useSelector(
    (state: any) => state.user.appTheme,
  );
  const themeAppearance = getAssetFromTheme(
    appTheme,
    osThemeName,
    AppThemeKey.light,
    AppThemeKey.dark,
  );
  let colors: Colors;
  let theme: Theme;

  const setDarkStatusBar = () => {
    StatusBar.setBarStyle('light-content', true);
    Device.isAndroid() &&
      StatusBar.setBackgroundColor(darkTheme.colors.background.default);
  };

  const setLightStatusBar = () => {
    StatusBar.setBarStyle('dark-content', true);
    Device.isAndroid() &&
      StatusBar.setBackgroundColor(lightTheme.colors.background.default);
  };

  switch (appTheme) {
    /* eslint-disable no-fallthrough */
    case AppThemeKey.os: {
      if (osThemeName === AppThemeKey.light) {
        theme = lightTheme;
        colors = lightTheme.colors;
        setLightStatusBar();
        break;
      } else if (osThemeName === AppThemeKey.dark) {
        theme = darkTheme;
        colors = darkTheme.colors;
        setDarkStatusBar();
        break;
      } else {
        // Cover cases where OS returns undefined
        theme = lightTheme;
        colors = lightTheme.colors;
        setLightStatusBar();
      }
    }
    case AppThemeKey.light:
      theme = lightTheme;
      colors = lightTheme.colors;
      setLightStatusBar();
      break;
    case AppThemeKey.dark:
      theme = darkTheme;
      colors = darkTheme.colors;
      setDarkStatusBar();
      break;
    default:
      // Default uses light theme
      theme = lightTheme;
      colors = lightTheme.colors;
      setLightStatusBar();
  }

  return { colors, theme, themeAppearance, typography: lightTheme.typography };
};

export const useAppThemeFromContext = (): Theme => {
  const theme = useContext<Theme>(ThemeContext);
  return theme;
};

export const useTheme = (): Theme => {
  const theme = useAppThemeFromContext() || mockTheme;
  return theme;
};

/**
 * Hook that returns asset based on theme (Functional components)
 *
 * @param light Light asset
 * @param dark Dark asset
 * @returns Asset based on theme
 */
export const useAssetFromTheme = (light: any, dark: any) => {
  const osColorScheme = useColorScheme();
  const appTheme = useSelector((state: any) => state.user.appTheme);
  const asset = getAssetFromTheme(appTheme, osColorScheme, light, dark);

  return asset;
};
