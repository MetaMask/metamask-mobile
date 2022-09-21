// Third party dependencies.
import { StyleSheet } from 'react-native';

/**
 * Style sheet function for AccountConnectSingleSelector screen.
 * @returns StyleSheet object.
 */
const styleSheet = () => {
  return StyleSheet.create({
    body: {
      paddingHorizontal: 16,
    },
    description: {
      textAlign: 'center',
      marginVertical: 16,
    },
    sheetActionContainer: {
      marginTop: 16,
    },
    ctaButtonsContainer: {
      marginTop: 24,
      flexDirection: 'row',
    },
    button: { flex: 1 },
    buttonSeparator: {
      width: 16,
    },
    downCaretContainer: { justifyContent: 'center', flex: 1 },
  });
};

export default styleSheet;
