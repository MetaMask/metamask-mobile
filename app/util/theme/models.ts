import { ThemeTypography } from '@metamask/design-tokens/dist/js/typography/types';

// TODO: This should probably be defined from @metamask/design-token library
export type Colors = any;

export enum AppThemeKey {
  os = 'os',
  light = 'light',
  dark = 'dark',
}
export interface Theme {
  colors: Colors;
  typography: ThemeTypography;
  themeAppearance: AppThemeKey.light | AppThemeKey.dark;
}
