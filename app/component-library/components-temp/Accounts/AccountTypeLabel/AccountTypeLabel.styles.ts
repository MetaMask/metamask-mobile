// Third party dependencies.
import { fontStyles } from '../../../../../app/styles/common';
import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';
/**
 * Style sheet for AccountBase component.
 *
 * @returns StyleSheet object.
 */

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    accountNameLabelText: {
      marginLeft: 4,
      marginRight: 4,
      paddingHorizontal: 8,
      ...fontStyles.bold,
      borderWidth: 1,
      borderRadius: 8,
      fontSize: 10,
      borderColor: theme.colors.border.default,
    },
  });
};

export default styleSheet;
