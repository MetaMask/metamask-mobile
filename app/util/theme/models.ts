import { Theme as DesignTokenTheme } from '@metamask/design-tokens';
import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';

export type Colors = ThemeColors;

export enum AppThemeKey {
  os = 'os',
  light = 'light',
  dark = 'dark',
}
export interface Theme extends DesignTokenTheme {
  themeAppearance: AppThemeKey.light | AppThemeKey.dark;
}
