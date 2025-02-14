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
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      alignSelf: 'center',
    },
    heading: {
      ...(typography.sHeadingMD as TextStyle),
      color: colors.text.default,
    },
    body: {
      ...(typography.sBodyMD as TextStyle),
      color: colors.text.default,
    },
    buttonContainer: {
      flexDirection: 'row',
      paddingTop: 16,
    },
    button: {
      flex: 1,
    },
  });
