// Third party dependencies.
import { StyleSheet } from 'react-native';
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
    warningIcon: {
      color: colors.error.default,
    },
    heading: {
      color: colors.text.default,
      ...typography.sHeadingMD,
    },
    explanationText: {
      ...typography.sBodyMD,
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
      ...typography.sBodyMD,
      flex: 1,
      marginStart: 8,
    },
    bold: {
      ...typography.sBodyMDBold,
    },
    understandCheckboxView: {
      margin: 16,
      flexDirection: 'row',
      justifyContent: 'flex-start',
    },
    understandCheckboxLabel: {
      ...typography.sBodyMD,
      marginStart: 16,
    },
    iOnlySignInputView: {
      paddingVertical: 24,
    },
    iOnlySignInputLabel: {
      ...typography.sBodyMDBold,
      textAlign: 'left',
    },
    iOnlySignTextInput: {
      paddingVertical: 24,
      alignSelf: 'flex-start',
    },
    textConfirmError: {
      ...typography.sBodySM,
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
