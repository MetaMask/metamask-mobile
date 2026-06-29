import { StyleSheet } from 'react-native';

/**
 * The onboarding is a single full-screen Rive artboard that renders every
 * visual (background, copy, cards, buttons). React Native only provides the
 * full-bleed container; the Rive element itself fills it via
 * `StyleSheet.absoluteFillObject`.
 */
const createStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
  });

export default createStyles;
