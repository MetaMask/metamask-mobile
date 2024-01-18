/**
 * Common styles and variables
 */

import { TextStyle, ViewStyle } from 'react-native';

/**
 * Map of color names to HEX values
 */
export const colors = {
  black: '#24292E',
  blackTransparent: 'rgba(0, 0, 0, 0.5)',
  white: '#FFFFFF',
  whiteTransparent: 'rgba(255, 255, 255, 0.7)',
  yellow: '#FFD33D',
  transparent: 'transparent',
  shadow: '#6a737d',
  // Do not change the values of applePay tokens unless noted by
  // https://developer.apple.com/design/human-interface-guidelines/apple-pay
  applePayBlack: '#000000',
  applePayWhite: '#FFFFFF',
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
    fontFamily: 'EuclidCircularB-Regular',
    fontWeight: '400',
  },
  light: {
    fontFamily: 'EuclidCircularB-Regular',
    fontWeight: '300',
  },
  thin: {
    fontFamily: 'EuclidCircularB-Regular',
    fontWeight: '100',
  },
  bold: {
    fontFamily: 'EuclidCircularB-Bold',
    fontWeight: '600',
  },
};
