/**
 * Common styles and variables
 */

import { TextStyle, ViewStyle } from 'react-native';
import { customColors, staticColors } from './colors';

/**
 * Map of color names — sources hex values from `app/styles/colors.ts`.
 * Add new custom colors there, not here.
 */
export const colors = {
  blackTransparent: 'rgba(0, 0, 0, 0.5)',
  whiteTransparent: 'rgba(255, 255, 255, 0.7)',
  white: staticColors.white,
  transparent: 'transparent',
  overlay: 'rgba(242, 244, 246, 0.33)',
  applePayBlack: staticColors.applePayBlack,
  applePayWhite: staticColors.applePayWhite,
  telegramBlue: staticColors.telegramBlue,
  btnBlack: staticColors.btnBlack,
  btnBlackText: staticColors.btnBlackText,
  btnBlackInverse: 'rgba(60, 77, 157, 0.1)',
  modalScrollButton: staticColors.modalScrollButton,
  gettingStartedPageBackgroundColor: customColors.dark.gettingStartedBackground,
  gettingStartedTextColor: customColors.light.gettingStartedText,
  gettingStartedPageBackgroundColorLightMode:
    customColors.light.gettingStartedBackground,
  transakCheckoutDark: staticColors.transakCheckoutDark,
  moonpayCheckoutDark: staticColors.moonpayCheckoutDark,
  banxaCheckoutDark: staticColors.banxaCheckoutDark,
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
    fontFamily: 'Geist-Regular',
  },
  light: {
    fontFamily: 'Geist-Regular',
  },
  thin: {
    fontFamily: 'Geist-Regular',
  },
  bold: {
    fontFamily: 'Geist-SemiBold',
  },
  medium: {
    fontFamily: 'Geist-Medium',
  },
};
