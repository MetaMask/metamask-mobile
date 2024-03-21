import type { Theme as DesignTokenTheme } from '@metamask/design-tokens';
import { default as TempBrandColors } from './temp-tokens/brandColors.types';

export enum AppThemeKey {
  os = 'os',
  light = 'light',
  dark = 'dark',
}
export interface Theme extends DesignTokenTheme {
  themeAppearance: AppThemeKey.light | AppThemeKey.dark;
  brandColors: BrandColors;
}

export type Colors = Theme['colors'];
export type Shadows = Theme['shadows'];
export type BrandColors = TempBrandColors;
