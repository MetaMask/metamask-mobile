import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.elevated1,
      borderWidth: 1,
      borderColor: colors.border.alternative,
      padding: 16,
      paddingBottom: 36,
      borderTopRightRadius: 16,
      borderTopLeftRadius: 16,
    },
    button: {
      width: '100%',
    },
    inputsContainer: {
      marginTop: 16,
      marginBottom: 8,
    },
  });
};

export default styleSheet;
