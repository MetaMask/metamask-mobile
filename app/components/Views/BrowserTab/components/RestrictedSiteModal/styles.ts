import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    modal: {
      margin: 0,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    container: {
      backgroundColor: colors.background.default,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
    },
    iconContainer: {
      marginBottom: 16,
      padding: 12,
      borderRadius: 50,
      backgroundColor: colors.warning.muted,
    },
    title: {
      textAlign: 'center',
      marginBottom: 12,
    },
    description: {
      textAlign: 'center',
      marginBottom: 16,
    },
    url: {
      textAlign: 'center',
      marginBottom: 16,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      width: '100%',
      overflow: 'hidden',
    },
    explanation: {
      color: colors.text.alternative,
      textAlign: 'center',
      marginBottom: 24,
    },
  });
};

export default styleSheet;
