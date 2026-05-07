import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    section: {
      marginBottom: 24,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.muted,
      paddingTop: 32,
    },
  });
};

export default styleSheet;
