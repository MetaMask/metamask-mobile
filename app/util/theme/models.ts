import type {
  Theme as DesignTokenTheme,
  BrandColor,
} from '@metamask/design-tokens';

export enum AppThemeKey {
  os = 'os',
  light = 'light',
  dark = 'dark',
}
export interface Theme extends DesignTokenTheme {
  themeAppearance: AppThemeKey.light | AppThemeKey.dark;
  brandColors: BrandColor;
}

export type Colors = Theme['colors'];
export type Shadows = Theme['shadows'];
export type BrandColors = BrandColor;
