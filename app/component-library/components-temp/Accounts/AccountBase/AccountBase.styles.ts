// Third party dependencies.
import { fontStyles } from '../../../../../app/styles/common';
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
    marginLeft: 4,
    paddingHorizontal: 8,
    ...fontStyles.bold,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 10,
  },
});

export default styleSheet;
