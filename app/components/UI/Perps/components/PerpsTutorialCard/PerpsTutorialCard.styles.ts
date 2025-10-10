import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      padding: 12,
      alignItems: 'center',
      gap: 70,
      borderRadius: 12,
      backgroundColor: colors.background.muted,
    },
  });
};

export default styleSheet;
