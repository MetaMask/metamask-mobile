import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    section: {
      marginBottom: 8,
    },
    box: {
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      borderRadius: 8,
      backgroundColor: theme.colors.background.alternative,
      maxHeight: 140,
      marginTop: 8,
    },
    boxScroll: {
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    item: {
      paddingVertical: 4,
    },
    emptyState: {
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    selectedRow: {
      paddingVertical: 6,
    },
    selectedRowLabel: {
      marginBottom: 2,
    },
    selectableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 6,
      marginVertical: 2,
    },
    selectableRowSelected: {
      backgroundColor: theme.colors.primary.muted,
    },
    selectableRowLabel: {
      flexShrink: 1,
      paddingRight: 8,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border.muted,
      marginVertical: 16,
    },
    summarySection: {
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      borderRadius: 8,
      backgroundColor: theme.colors.background.alternative,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    summaryTitle: {
      marginBottom: 8,
    },
    summaryRow: {
      paddingVertical: 6,
    },
    summaryRowLabel: {
      marginBottom: 2,
    },
  });
};

export default styleSheet;
