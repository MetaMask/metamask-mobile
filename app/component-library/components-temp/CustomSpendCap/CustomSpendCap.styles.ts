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
  const { colors } = theme;
  return StyleSheet.create({
    container: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      color: colors.text.default,
      marginRight: 4,
    },
    descriptionContainer: {
      marginTop: 16,
    },
    description: {
      color: theme.colors.text.alternative,
    },
    errorDescription: {
      color: colors.error.default,
      marginTop: 8,
    },
    inputContainer: {
      marginTop: 8,
    },
    modalTitle: {
      color: colors.text.default,
    },
    modalTitleDanger: {
      color: colors.error.default,
    },
  });
};

export default styleSheet;
