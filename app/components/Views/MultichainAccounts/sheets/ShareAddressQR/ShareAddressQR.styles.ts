import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    textContainer: {
      marginTop: 24,
      marginBottom: 16,
      alignItems: 'center',
    },
    networkTitle: {
      marginBottom: 8,
      textAlign: 'center',
    },
    instructionText: {
      textAlign: 'center',
      paddingHorizontal: 16,
    },
    addressContainer: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 16,
    },
  });
};

export default styleSheet;
