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
      alignItems: 'center',
      marginBottom: 12,
      paddingHorizontal: 16,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    listContainer: {
      gap: 1,
      paddingHorizontal: 16,
    },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: colors.background.section,
    },
    activityItemFirst: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    activityItemLast: {
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      marginRight: 16,
    },
    activityInfo: {
      flex: 1,
    },
    activityTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    activityType: {},
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
