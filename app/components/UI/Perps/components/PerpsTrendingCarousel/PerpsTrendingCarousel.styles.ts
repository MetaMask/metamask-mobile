import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      marginBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
      paddingBottom: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingHorizontal: 16,
    },
    listContent: {
      // No horizontal padding - PerpsMarketRowItem handles its own padding
    },
    emptyText: {
      paddingHorizontal: 16,
    },
  });
};

export default styleSheet;
