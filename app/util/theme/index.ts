import React, { useContext } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
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
