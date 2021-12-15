export interface Colors {
	[key: string]: string;
}

export interface Theme {
	colors: Colors;
}

export enum AppThemeNames {
	OS = 'os',
	Light = 'light',
	Dark = 'dark',
	Playful = 'playful',
}

export const AppThemeLabels = {
	[AppThemeNames.OS]: 'Automatic',
	[AppThemeNames.Light]: 'Light',
	[AppThemeNames.Dark]: 'Dark',
	[AppThemeNames.Playful]: 'Playful',
};
