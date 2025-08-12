import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      marginBottom: 36,
      paddingLeft: 24,
      paddingRight: 24,
    },
    avatar: {
      marginBottom: 8,
    },
    address: {
      marginBottom: 8,
    },
    copyAddress: {
      marginBottom: 16,
      padding: 8,
      gap: 4,
      borderRadius: 999,
      backgroundColor: colors.primary.muted,
      color: colors.primary.default,
    },
  });
};

export default styleSheet;
