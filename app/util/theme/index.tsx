import { useColorScheme } from 'react-native';
import { Colors, AppThemeNames, Theme } from './models';
import colorTheme from './colors';
import { useSelector } from 'react-redux';

/* eslint-disable  import/prefer-default-export */
export const useAppTheme = (): Theme => {
	const osThemeName = useColorScheme();
	const appTheme: AppThemeNames = useSelector((state: any) => state.user.appTheme);
	let colors: Colors;

	switch (appTheme) {
		case AppThemeNames.OS:
			colors = osThemeName === 'dark' ? colorTheme.darkTheme : colorTheme.lightTheme;
			break;
		case AppThemeNames.Light:
			colors = colorTheme.lightTheme;
			break;
		case AppThemeNames.Dark:
			colors = colorTheme.darkTheme;
			break;
		case AppThemeNames.Playful:
			colors = colorTheme.playfulTheme;
			break;
		default:
			// Default uses light theme
			colors = colorTheme.lightTheme;
	}

	return { colors };
};
