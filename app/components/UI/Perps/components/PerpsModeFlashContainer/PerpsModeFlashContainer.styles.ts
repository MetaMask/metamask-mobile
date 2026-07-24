/* eslint-disable @metamask/design-tokens/color-no-hex */
import { Platform, StyleSheet } from 'react-native';

/**
 * Perps mode-switch flash colors (TAT-3551).
 *
 * These accent values are taken directly from the Figma spec and are not yet
 * part of the shared design-token palette, so they are defined locally.
 * - `accent/02/dark`    → flash background
 * - `accent/02/light`   → gradient start of the "Pro" title
 * - `accent/02/normal`  → gradient end of the "Pro" title / solid "Lite" title
 */
export const PERPS_MODE_FLASH_BACKGROUND = '#3d065f';
export const PERPS_MODE_FLASH_TEXT = '#d075ff';
export const PERPS_MODE_FLASH_PRO_GRADIENT = ['#eac2ff', '#d075ff'];

const styleSheet = () =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      backgroundColor: PERPS_MODE_FLASH_BACKGROUND,
      // Sit above every Perps screen while the flash is visible.
      zIndex: 1000,
      elevation: 1000,
    },
    title: {
      textAlign: 'center',
      color: PERPS_MODE_FLASH_TEXT,
      fontSize: 56,
      lineHeight: 60,
      fontFamily: 'MMPoly-Regular',
      fontWeight: Platform.OS === 'ios' ? '900' : 'normal',
      includeFontPadding: false,
    },
    // The gradient fill is masked by the title text; the underlying text is
    // transparent so only the gradient shows through the glyphs.
    gradientFill: {
      alignItems: 'center',
    },
    gradientTextMask: {
      opacity: 0,
    },
  });

export default styleSheet;
