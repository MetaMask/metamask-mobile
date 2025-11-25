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
      marginBottom: 16,
    },
    listContainer: {
      gap: 1,
    },
    tradeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.background.section,
    },
    tradeItemFirst: {
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
    },
    tradeItemLast: {
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
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
