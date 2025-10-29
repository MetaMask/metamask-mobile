import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    container: {
      marginBottom: 16,
      marginRight: 16,
      marginLeft: 16,
      borderRadius: 16,
      backgroundColor: theme.colors.background.muted,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
  });
};

export default styleSheet;
