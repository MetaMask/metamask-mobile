/* eslint-disable @metamask/design-tokens/color-no-hex */
import { Platform, StyleSheet } from 'react-native';

/**
 * Perps mode-switch interstitial colors (TAT-3551).
 *
 * These accent values are taken directly from the Figma spec and are not yet
 * part of the shared design-token palette, so they are defined locally.
 * - `accent/02/dark`   → background
 * - `accent/02/normal` → title text
 */
export const PERPS_MODE_TRANSITION_BACKGROUND = '#3d065f';
export const PERPS_MODE_TRANSITION_TEXT = '#d075ff';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      backgroundColor: PERPS_MODE_TRANSITION_BACKGROUND,
    },
    title: {
      textAlign: 'center',
      color: PERPS_MODE_TRANSITION_TEXT,
      fontSize: 56,
      lineHeight: 60,
      fontFamily: 'MMPoly-Regular',
      fontWeight: Platform.OS === 'ios' ? '900' : 'normal',
    },
  });

export default styleSheet;
