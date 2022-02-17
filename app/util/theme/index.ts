import React, { useContext } from 'react';
import { useColorScheme, StatusBar, ColorSchemeName } from 'react-native';
import { Colors, AppThemeNames, Theme } from './models';
import { useSelector } from 'react-redux';
import { colors as colorTheme } from '@metamask/design-tokens';
import Device from '../device';

export const ThemeContext = React.createContext<any>(undefined);

/* eslint-disable  import/prefer-default-export */
export const useAppTheme = (): Theme => {
	const osThemeName = useColorScheme();
	const appTheme: AppThemeNames = useSelector((state: any) => state.user.appTheme);
	let colors: Colors;

	const setDarkStatusBar = () => {
		StatusBar.setBarStyle('light-content', true);
		Device.isAndroid() && StatusBar.setBackgroundColor(colorTheme.dark.background.default);
	};

	const setLightStatusBar = () => {
		StatusBar.setBarStyle('dark-content', true);
		Device.isAndroid() && StatusBar.setBackgroundColor(colorTheme.light.background.default);
	};

	switch (appTheme) {
		/* eslint-disable */
		case AppThemeNames.OS: {
			if (osThemeName === 'light') {
				colors = colorTheme.light;
				setLightStatusBar();
				break;
			} else if (osThemeName === 'dark') {
				colors = colorTheme.dark;
				setDarkStatusBar();
				break;
			}
		}
		case AppThemeNames.Light:
			/* eslint-enable */
			colors = colorTheme.light;
			setLightStatusBar();
			break;
		case AppThemeNames.Dark:
			colors = colorTheme.dark;
			setDarkStatusBar();
			break;
		default:
			// Default uses light theme
			colors = colorTheme.light;
			setLightStatusBar();
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
	let asset;
	switch (appTheme) {
		case 'light':
			asset = light;
			break;
		case 'dark':
			asset = dark;
			break;
		case 'os':
			asset = osColorScheme === 'dark' ? dark : light;
			break;
		default:
			asset = light;
	}
	return asset;
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
