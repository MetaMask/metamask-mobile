import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    sectionHeader: {
      paddingVertical: 12,
      paddingHorizontal: 0,
    },
    sectionHeaderSkeleton: {
      borderRadius: 4,
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 0,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    tokenIconContainer: {
      marginRight: 12,
    },
    tokenIcon: {
      borderRadius: 18,
    },
    transactionContent: {
      flex: 1,
      justifyContent: 'center',
    },
    transactionTitle: {
      marginBottom: 4,
      borderRadius: 4,
    },
    transactionSubtitle: {
      borderRadius: 4,
    },
    rightContent: {
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    rightContentSkeleton: {
      borderRadius: 4,
    },
  });
};

export default styleSheet;
