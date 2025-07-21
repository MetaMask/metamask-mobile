import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme; vars: {} }) => {
  const { theme } = params;
  return StyleSheet.create({
    container: {
      padding: 20,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border.default,
    },
  });
};

export default styleSheet;
