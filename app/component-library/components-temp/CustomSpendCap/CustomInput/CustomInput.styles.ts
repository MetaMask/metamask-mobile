// Third party dependencies.
import { StyleSheet, TextStyle } from 'react-native';

import { Theme } from '../../../../util/theme/models';
/**
 * Style sheet for Custom Input component.
 *
 * @returns StyleSheet object.
 */

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors, typography } = theme;

  return StyleSheet.create({
    container: {
      backgroundColor: colors.background.default,
      borderRadius: 8,
      padding: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    fixedPadding: {
      padding: 0,
    },
    body: {
      flexDirection: 'row',
      flex: 1,
      alignItems: 'center',
    },
    input: {
      paddingTop: 0,
      paddingBottom: 0,
      flexGrow: 1,
      marginRight: 16,
      color: colors.text.default,
      ...typography.sBodyMD,
    } as TextStyle,
    maxValueText: {
      color: theme.colors.text.alternative,
    },
    warningValue: {
      color: theme.colors.error.default,
    },
  });
};

export default styleSheet;
