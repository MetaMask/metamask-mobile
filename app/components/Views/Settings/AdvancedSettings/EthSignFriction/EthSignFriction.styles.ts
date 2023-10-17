// Third party dependencies.
import { StyleSheet, TextStyle } from 'react-native';
import { typography } from '@metamask/design-tokens';
import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
/**
 * Style sheet function for EthSignFriction component.
 *
 * @returns StyleSheet object.
 */

export default (colors: ThemeColors) =>
  StyleSheet.create({
    frictionContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      alignSelf: 'center',
    },
    heading: {
      ...(typography.sHeadingMD as TextStyle),
      color: colors.text.default,
    },
    explanationText: {
      ...(typography.sBodyMD as TextStyle),
      color: colors.text.default,
    },
    warningBox: {
      flexDirection: 'row',
      backgroundColor: colors.error.muted,
      borderLeftColor: colors.error.default,
      borderRadius: 4,
      borderLeftWidth: 4,
      marginTop: 24,
      paddingStart: 11,
      paddingEnd: 8,
      paddingVertical: 8,
    },
    warningText: {
      ...(typography.sBodyMD as TextStyle),
      color: colors.text.default,
      flex: 1,
      marginStart: 8,
    },
    important: {
      ...(typography.sBodyMDBold as TextStyle),
    },
    understandCheckboxView: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      margin: 16,
    },
    understandCheckboxLabel: {
      ...(typography.sBodyMD as TextStyle),
      color: colors.text.default,
      marginStart: 16,
    },
    iOnlySignInputView: {
      paddingVertical: 24,
    },
    iOnlySignInputLabel: {
      ...(typography.sBodyMDBold as TextStyle),
      color: colors.text.default,
      textAlign: 'left',
    },
    iOnlySignTextInput: {
      paddingVertical: 24,
      alignSelf: 'flex-start',
    },
    confirmTextError: {
      ...(typography.sBodySM as TextStyle),
      color: colors.error.default,
    },
    buttonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
    },
    button: {
      flex: 1,
    },
    primaryButton: {
      marginStart: 16,
    },
  });
