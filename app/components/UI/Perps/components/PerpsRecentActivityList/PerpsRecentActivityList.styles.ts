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
      marginBottom: 12,
      paddingHorizontal: 16,
    },
    activityItem: {
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
