// Third party dependencies.
import { StyleSheet, TextStyle } from 'react-native';
import { typography, ThemeColors } from '@metamask/design-tokens';

/**
 * Style sheet function for AmbiguousAddressSheet component.
 *
 * @returns StyleSheet object.
 */

export default (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      justifyContent: 'center',
      padding: 16,
      alignSelf: 'center',
    },
    heading: {
      ...(typography.sHeadingMD as TextStyle),
      color: colors.text.default,
    },
    description: {
      alignSelf: 'flex-start',
      paddingTop: 16,
      paddingBottom: 10,
    },
    subtitle: {
      ...(typography.sBodyMD as TextStyle),
      color: colors.text.default,
      alignSelf: 'flex-start',
      paddingTop: 16,
      paddingBottom: 10,
    },
    buttonsContainer: {
      flexDirection: 'row',
      paddingTop: 24,
    },
    button: {
      flex: 1,
    },
    bullets: { paddingHorizontal: 8 },
    bullet: {
      alignSelf: 'flex-start',
    },
    title: {
      textAlign: 'center',
    },
    bottom: { paddingTop: 20 },
    spacer: { width: 20 },
    icon: { alignSelf: 'center', marginBottom: 10 },
    loaderWrapper: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 30,
    },
    loader: {
      marginTop: 180,
      justifyContent: 'center',
      textAlign: 'center',
    },
  });
