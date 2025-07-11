import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    content: {
      padding: 24,
      alignItems: 'center',
    },
    iconContainer: {
      marginBottom: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    warningIcon: {
      color: colors.warning.default,
    },
    message: {
      textAlign: 'center',
      marginBottom: 12,
      color: colors.text.default,
    },
    description: {
      textAlign: 'center',
      lineHeight: 20,
    },
    footer: {
      padding: 24,
      paddingTop: 0,
    },
  });
};

export default styleSheet; 