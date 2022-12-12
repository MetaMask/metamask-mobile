// Third party dependencies.
import { StyleSheet } from 'react-native';

import { Theme } from '../../../util/theme/models';
/**
 * Style sheet for CustomSpendCap component.
 *
 * @returns StyleSheet object.
 */

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.alternative,
      borderRadius: 5,
      marginHorizontal: 8,
      padding: 12,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    description: {
      color: theme.colors.text.alternative,
      marginHorizontal: 8,
    },
    errorValue: {
      color: theme.colors.error.default,
      marginHorizontal: 8,
      marginBottom: 8,
    },
  });
};

export default styleSheet;
