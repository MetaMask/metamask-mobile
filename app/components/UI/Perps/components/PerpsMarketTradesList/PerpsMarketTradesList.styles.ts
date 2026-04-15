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
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    },
    tradeItemLast: {
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
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
    tradeTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2,
    },
    tradeType: {},
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
