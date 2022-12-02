// Third party dependencies.
import { StyleSheet } from 'react-native';

/**
 * Style sheet function for ModalConfirmation component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @returns StyleSheet object.
 */
const styleSheet = () =>
  StyleSheet.create({
    contentContainer: {
      marginVertical: 16,
      marginHorizontal: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },

    description: { marginTop: 12, marginBottom: 24 },
    actionContainer: { flexDirection: 'row' },
    buttonDivider: {
      width: 16,
    },
    button: {
      flex: 1,
    },
  });

export default styleSheet;
