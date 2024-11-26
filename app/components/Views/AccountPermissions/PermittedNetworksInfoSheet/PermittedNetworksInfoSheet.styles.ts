// Third party dependencies.
import { StyleSheet } from 'react-native';

/**
 * Style sheet function for AccountConnectMultiSelector screen.
 * @returns StyleSheet object.
 */
const styleSheet = () =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    descriptionContainer: {
      marginBottom: 16,
    },
    buttonsContainer: {
      flexDirection: 'row',
      gap: 16,
    },
    button: {
      flex: 1,
    },
  });

export default styleSheet;
