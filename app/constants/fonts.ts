/**
 * Font constants for MetaMask Mobile
 *
 * This file maps old Full Names (with spaces) to new PostScript Names (with hyphens)
 * for proper font loading with expo-font.
 */

// PostScript Names (correct format for React Native)
export const FONT_FAMILIES = {
  GEIST_REGULAR: 'Geist-Regular',
  GEIST_MEDIUM: 'Geist-Medium',
  GEIST_BOLD: 'Geist-Bold',
  GEIST_REGULAR_ITALIC: 'Geist-Regular-Italic',
  GEIST_MEDIUM_ITALIC: 'Geist-Medium-Italic',
  GEIST_BOLD_ITALIC: 'Geist-Bold-Italic',
  MMSANS_REGULAR: 'MMSans-Regular',
  MMSANS_MEDIUM: 'MMSans-Medium',
  MMSANS_BOLD: 'MMSans-Bold',
  MMPOLY_REGULAR: 'MMPoly-Regular',
} as const;

// Weight to font family mapping for Geist fonts
export const GEIST_WEIGHT_MAPPING = {
  '100': 'Regular',
  '200': 'Regular',
  '300': 'Regular',
  '400': 'Regular',
  '500': 'Medium',
  '600': 'Medium',
  '700': 'Bold',
  '800': 'Bold',
  '900': 'Bold',
  normal: 'Regular',
  bold: 'Bold',
} as const;

export type FontWeight = keyof typeof GEIST_WEIGHT_MAPPING;
export type FontStyle = 'normal' | 'italic';
export type GeistFontSuffix = (typeof GEIST_WEIGHT_MAPPING)[FontWeight];
