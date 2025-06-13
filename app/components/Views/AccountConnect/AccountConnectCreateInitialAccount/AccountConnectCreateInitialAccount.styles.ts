// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

/**
 * Style sheet function for AccountConnectCreateInitialAccount screen.
 * @returns StyleSheet object.
 */

const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;
  return StyleSheet.create({
    container: {
      backgroundColor: colors.background.default,
      marginLeft: 16,
      marginRight: 16,
      padding: 16,
      borderRadius: 16,
    },
    description: {
      textAlign: 'center',
    },
    button: {
      minHeight: 48,
    },
  });
};

export default styleSheet;
