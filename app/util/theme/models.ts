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
