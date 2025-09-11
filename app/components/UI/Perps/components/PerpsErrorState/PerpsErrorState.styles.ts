import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
    },
    content: {
      alignItems: 'center',
      maxWidth: 320,
      width: '100%',
    },
    icon: {
      marginBottom: 24,
    },
    title: {
      marginBottom: 12,
      textAlign: 'center',
    },
    description: {
      marginBottom: 32,
      textAlign: 'center',
      lineHeight: 20,
    },
    button: {
      marginTop: 8,
    },
  });
};

export default styleSheet;
