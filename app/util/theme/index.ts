import React, { useContext } from 'react';
import { useColorScheme, StatusBar, ColorSchemeName } from 'react-native';
import { Colors, AppThemeNames, Theme } from './models';
import { useSelector } from 'react-redux';
import { colors as colorTheme } from '@metamask/design-tokens';

export const ThemeContext = React.createContext<any>(undefined);

/* eslint-disable  import/prefer-default-export */
export const useAppTheme = (): Theme => {
	const osThemeName = useColorScheme();
	const appTheme: AppThemeNames = useSelector((state: any) => state.user.appTheme);
	let colors: Colors;

	switch (appTheme) {
		case AppThemeNames.OS:
			colors = osThemeName === 'dark' ? colorTheme.dark : colorTheme.light;
			StatusBar.setBarStyle('default', true);
			break;
		case AppThemeNames.Light:
			colors = colorTheme.light;
			StatusBar.setBarStyle('dark-content', true);
			break;
		case AppThemeNames.Dark:
			colors = colorTheme.dark;
			StatusBar.setBarStyle('light-content', true);
			break;
		default:
			// Default uses light theme
			colors = colorTheme.light;
			StatusBar.setBarStyle('dark-content', true);
	}

	return { colors };
};

export const useAppThemeFromContext = (): Theme => {
	const theme = useContext<Theme>(ThemeContext);
	return theme;
};

/**
 * Utility function for getting asset from theme (Class components)
 *
 * @param appTheme Theme from app
 * @param osColorScheme Theme from OS
 * @param light Light asset
 * @param dark Dark asset
 * @returns
 */
export const getAssetFromTheme = (appTheme: AppThemeNames, osColorScheme: ColorSchemeName, light: any, dark: any) => {
	let image;
	switch (appTheme) {
		case 'light':
			image = light;
			break;
		case 'dark':
			image = dark;
			break;
		case 'os':
			image = osColorScheme === 'dark' ? dark : light;
			break;
		default:
			image = light;
	}
	return image;
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
