import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    heading: {
      textAlign: 'center',
      marginTop: 12,
      marginBottom: 16,
      fontWeight: 'bold',
    },
    description: {
      textAlign: 'center',
    },
    iconContainer: {
      width: 40,
      height: 40,
      padding: 4,
      borderRadius: 40,
      backgroundColor: theme.colors.success.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    footerContent: {
      gap: 8,
    },
  });
};

export default styleSheet;
