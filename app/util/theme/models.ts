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
