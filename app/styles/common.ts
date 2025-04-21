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
  transparent: 'transparent',
  overlay: 'rgba(242, 244, 246, 0.33)',
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
    fontFamily: 'CentraNo1-Book',
    fontWeight: '400',
  },
  light: {
    fontFamily: 'CentraNo1-Book',
    fontWeight: '300',
  },
  thin: {
    fontFamily: 'CentraNo1-Book',
    fontWeight: '100',
  },
  bold: {
    fontFamily: 'CentraNo1-Bold',
    fontWeight: '600',
  },
};
