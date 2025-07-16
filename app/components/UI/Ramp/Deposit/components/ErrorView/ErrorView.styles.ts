import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },

    errorIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.error.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centeredText: {
      textAlign: 'center',
    },
    button: {
      alignSelf: 'center',
    },
  });
};

export default styleSheet;
