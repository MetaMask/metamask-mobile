import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    section: {
      marginBottom: 30,
    },
    contentContainer: {
      marginHorizontal: 16,
      borderRadius: 16,
      paddingTop: 12,
      backgroundColor: theme.colors.background.muted,
    },
  });
};

export default styleSheet;
