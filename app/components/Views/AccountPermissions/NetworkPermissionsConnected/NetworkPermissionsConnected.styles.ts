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
  sectionTitle: { marginBottom: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
  },
  managePermissionsButton: { marginHorizontal: 16, marginTop: 16 },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButtonContainer: { alignSelf: 'flex-start', marginLeft: 4 },
  networkSelectorListContainer: {
    marginBottom: 16,
    marginTop: 4,
  },
});

export default styleSheet;
