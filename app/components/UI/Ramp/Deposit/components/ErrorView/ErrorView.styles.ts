import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    content: {
      alignItems: 'center',
      paddingHorizontal: 16,
      justifyContent: 'center',
      height: '100%',
    },
    mainSection: {
      alignItems: 'center',
      marginBottom: 24,
    },
    iconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    errorIconContainer: {
      width: 56,
      height: 56,
      padding: 8,
      borderRadius: 28,
      backgroundColor: theme.colors.error.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      textAlign: 'center',
      marginBottom: 12,
    },
    description: {
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 22,
    },
    button: {
      minWidth: 140,
      alignSelf: 'center',
    },
  });
};

export default styleSheet;
