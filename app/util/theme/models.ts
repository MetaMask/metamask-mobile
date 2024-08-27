import type { Theme as DesignTokenTheme } from '@metamask/design-tokens';
import type { BrandColor } from '@metamask/design-tokens/dist/types/js/brandColor/brandColor.types';

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
