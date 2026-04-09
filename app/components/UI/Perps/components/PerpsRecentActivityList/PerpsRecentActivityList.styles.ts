import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      marginBottom: 16,
      paddingTop: 8,
      paddingBottom: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
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
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.background.section,
    },
    activityItemFirst: {
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      paddingTop: 16,
    },
    activityItemLast: {
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
      paddingBottom: 16,
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
