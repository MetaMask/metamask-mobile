// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

/**
 * Style sheet function for AddAccount screen.
 * @returns StyleSheet object.
 */

const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;

  return StyleSheet.create({
    container: {
      paddingTop: 8,
      paddingBottom: 24,
      paddingLeft: 24,
      paddingRight: 24,
    },
    title: {
      color: colors.text.alternative,
      marginBottom: 16,
    },
    linkContainer: {
      marginBottom: 16,
    },
  });
};

export default styleSheet;
