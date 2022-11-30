// Third party dependencies.
import { StyleSheet } from 'react-native';

import { Theme } from '../../../util/theme/models';
/**
 * Style sheet for Custom Input component.
 *
 * @returns StyleSheet object.
 */

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.default,
      margin: 10,
      borderRadius: 5,
      padding: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    body: {
      flexDirection: 'row',
      marginHorizontal: 5,
      width: '90%',
      alignItems: 'center',
    },
    input: {
      marginHorizontal: 3,
      marginVertical: 5,
      paddingTop: 0,
      paddingBottom: 0,
      flexDirection: 'row',
    },
    maxValueText: {
      color: theme.colors.text.alternative,
    },
    ticker: {
      paddingLeft: 5,
    },
    warningValue: {
      color: theme.colors.error.default,
    },
  });
};

export default styleSheet;
