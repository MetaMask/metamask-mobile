import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      marginBottom: 16,
      paddingBottom: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: 16,
    },
    listContainer: {
      gap: 1,
      paddingHorizontal: 16,
    },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.background.section,
    },
    activityItemFirst: {
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
    },
    activityItemLast: {
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      marginRight: 12,
    },
    activityInfo: {
      flex: 1,
    },
    activityType: {
      marginBottom: 4,
    },
    activityAmount: {
      color: colors.text.alternative,
    },
    rightSection: {
      alignItems: 'flex-end',
    },
    emptyText: {
      paddingHorizontal: 16,
    },
  });
};

export default styleSheet;
