import React, { useContext } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import { Colors, AppThemeNames, Theme } from './models';
import colorTheme from './colors';
import { useSelector } from 'react-redux';

export const ThemeContext = React.createContext<any>(undefined);

/* eslint-disable  import/prefer-default-export */
export const useAppTheme = (): Theme => {
	const osThemeName = useColorScheme();
	const appTheme: AppThemeNames = useSelector((state: any) => state.user.appTheme);
	let colors: Colors;

	switch (appTheme) {
		case AppThemeNames.OS:
			{
				const isDarkTheme = osThemeName === 'dark';
				colors = isDarkTheme ? colorTheme.darkTheme : colorTheme.lightTheme;
				StatusBar.setBarStyle('default', true);
			}
			break;
		case AppThemeNames.Light:
			colors = colorTheme.lightTheme;
			StatusBar.setBarStyle('dark-content', true);
			break;
		case AppThemeNames.Dark:
			colors = colorTheme.darkTheme;
			StatusBar.setBarStyle('light-content', true);
			break;
		default:
			// Default uses light theme
			colors = colorTheme.lightTheme;
			StatusBar.setBarStyle('dark-content', true);
	}

	return { colors };
};

export const useAppThemeFromContext = (): Theme => {
	const theme = useContext<Theme>(ThemeContext);
	return theme;
};
