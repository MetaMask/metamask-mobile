// Third party dependencies.
import { StyleSheet } from 'react-native';

/**
 * Style sheet function for AccountPermissionsConnected screen.
 * @returns StyleSheet object.
 */
const styleSheet = StyleSheet.create({
  body: {
    paddingHorizontal: 16,
  },
  networkPicker: {
    marginVertical: 16,
  },
  sheetActionContainer: {
    marginVertical: 16,
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
  disabled: {
    opacity: 0.5,
  },
});

export default styleSheet;
