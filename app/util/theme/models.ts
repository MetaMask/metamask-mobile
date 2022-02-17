// TODO: This should probably be defined from @metamask/design-token library
export type Colors = any;

export interface Theme {
	colors: Colors;
}

export enum AppThemeNames {
	OS = 'os',
	Light = 'light',
	Dark = 'dark',
}

// Used in Typescript files
export const AppThemeLabels = {
	[AppThemeNames.OS]: 'Automatic',
	[AppThemeNames.Light]: 'Light',
	[AppThemeNames.Dark]: 'Dark',
};

// Used in Javascript files
export const AppThemeLabelsObject = {
	os: 'Automatic',
	light: 'Light',
	dark: 'Dark',
};
