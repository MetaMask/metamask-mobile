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
});

export default styleSheet;
