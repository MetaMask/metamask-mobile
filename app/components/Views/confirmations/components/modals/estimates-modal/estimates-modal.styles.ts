import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.default,
      paddingBottom: 16,
      borderTopRightRadius: 16,
      borderTopLeftRadius: 16,
    },
  });
};

export default styleSheet;
