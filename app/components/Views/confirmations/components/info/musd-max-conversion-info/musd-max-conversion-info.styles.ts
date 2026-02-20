import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    detailsSection: {
      backgroundColor: colors.background.default,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginBottom: 16,
    },
    buttonContainer: {
      paddingTop: 16,
    },
    errorText: {
      textAlign: 'center',
    },
  });
};

export default styleSheet;
