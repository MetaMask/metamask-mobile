// Third party dependencies.
import { StyleSheet } from 'react-native';

/**
 * Style sheet for AccountBase component.
 *
 * @returns StyleSheet object.
 */
const styleSheet = StyleSheet.create({
  body: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeWrapper: {
    marginRight: 8,
    alignSelf: 'center',
  },
  label: {
    marginLeft: 'auto',
  },
  accountNameLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  accountNameLabelText: {
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
});

export default styleSheet;
