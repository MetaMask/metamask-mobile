// TODO: This should probably be defined from @metamask/design-token library
export type Colors = any;

export enum AppThemeKey {
  os = 'os',
  light = 'light',
  dark = 'dark',
}
export interface Theme {
  colors: Colors;
  themeAppearance: AppThemeKey.light | AppThemeKey.dark;
}
