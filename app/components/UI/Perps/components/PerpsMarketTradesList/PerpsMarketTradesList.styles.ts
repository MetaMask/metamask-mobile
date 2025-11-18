import type { Theme } from '../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      width: '100%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    tradeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    lastTradeItem: {
      borderBottomWidth: 0,
    },
    leftSection: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      marginRight: 12,
    },
    tradeInfo: {
      flex: 1,
    },
    tradeType: {
      marginBottom: 2,
    },
    rightSection: {
      alignItems: 'flex-end',
    },
    emptyText: {
      textAlign: 'center',
      paddingVertical: 24,
    },
  });
};

export default styleSheet;
