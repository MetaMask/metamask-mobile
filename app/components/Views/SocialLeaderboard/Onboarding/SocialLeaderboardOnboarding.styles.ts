import { StyleSheet } from 'react-native';

// The overlay copy renders over a brand-fixed dark-purple Rive artboard (same in
// light + dark), so it must stay white in every theme — theme-adaptive design
// tokens would flip to dark text in dark mode and become unreadable here.
const OVERLAY_TITLE_COLOR =
  // eslint-disable-next-line @metamask/design-tokens/color-no-hex
  '#FFFFFF';
const OVERLAY_DESCRIPTION_COLOR = 'rgba(255, 255, 255, 0.8)';

/**
 * The onboarding is a single full-screen Rive artboard that renders every
 * visual (background, trader cards, buttons). In the v4 ("hybrid") artboard the
 * step title + description are NOT baked into the Rive, so React Native renders
 * them as a non-interactive overlay pinned to the top of the screen, above the
 * Rive element which fills the container via `StyleSheet.absoluteFillObject`.
 */
const createStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    textOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    title: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '700',
      color: OVERLAY_TITLE_COLOR,
      textAlign: 'center',
    },
    description: {
      marginTop: 8,
      fontSize: 15,
      lineHeight: 20,
      color: OVERLAY_DESCRIPTION_COLOR,
      textAlign: 'center',
    },
  });

export default createStyles;
