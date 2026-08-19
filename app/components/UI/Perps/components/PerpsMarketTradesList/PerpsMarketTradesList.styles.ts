import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    tradeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      marginRight: 16,
    },
    tradeInfo: {
      flex: 1,
    },
    tradeTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    tradeType: {},
    rightSection: {
      alignItems: 'flex-end',
    },
    emptyText: {
      textAlign: 'center',
      paddingVertical: 24,
      paddingHorizontal: 16,
    },
  });
};

export default styleSheet;
