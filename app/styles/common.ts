/* eslint-disable @metamask/design-tokens/color-no-hex*/

/**
 * Common styles and variables
 */

import { TextStyle, ViewStyle } from 'react-native';

/**
 * Map of color names to HEX values
 */
export const colors = {
  blackTransparent: 'rgba(0, 0, 0, 0.5)',
  whiteTransparent: 'rgba(255, 255, 255, 0.7)',
  white: '#FFFFFF',
  transparent: 'transparent',
  overlay: 'rgba(242, 244, 246, 0.33)',
  // Do not change the values of applePay tokens unless noted by
  // https://developer.apple.com/design/human-interface-guidelines/apple-pay
  applePayBlack: '#000000',
  applePayWhite: '#FFFFFF',
  btnBlack: '#1C1E21',
  btnBlackText: '#FFFFFF',
  btnBlackInverse: 'rgba(60, 77, 157, 0.1)',
  modalScrollButton: '#ECEEFF',
  gettingStartedPageBackgroundColor: '#EAC2FF',
  gettingStartedTextColor: '#3D065F',
};

export const onboardingCarouselColors: Record<
  string,
  { color: string; background: string }
> = {
  one: {
    color: '#190066',
    background: '#E5FFC3',
  },
  two: {
    color: '#3D065F',
    background: '#FFA680',
  },
  three: {
    color: '#190066',
    background: '#CCE7FF',
  },
};

/**
 * Map of reusable base styles
 */
export const baseStyles: Record<string, ViewStyle> = {
  flexGrow: {
    flex: 1,
  },
  flexStatic: {
    flex: 0,
  },
};

/**
 * Map of reusable fonts
 */
export const fontStyles: Record<string, TextStyle> = {
  normal: {
    fontFamily: 'Geist Regular',
  },
  light: {
    fontFamily: 'Geist Regular',
  },
  thin: {
    fontFamily: 'Geist Regular',
  },
  bold: {
    fontFamily: 'Geist Bold',
  },
  medium: {
    fontFamily: 'Geist Medium',
  },
};
