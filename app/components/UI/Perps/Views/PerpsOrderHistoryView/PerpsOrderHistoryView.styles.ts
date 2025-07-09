import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

export const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text.default,
    },
    filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background.alternative,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
      backgroundColor: colors.background.default,
    },
    filterButtonActive: {
      backgroundColor: colors.primary.default,
      borderColor: colors.primary.default,
    },
    filterButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.muted,
    },
    filterButtonTextActive: {
      color: colors.primary.inverse,
    },
    ordersSection: {
      flex: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.default,
    },
    orderCount: {
      fontSize: 14,
      color: colors.text.muted,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 64,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.default,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyDescription: {
      fontSize: 14,
      color: colors.text.muted,
      textAlign: 'center',
      lineHeight: 20,
    },
    summaryContainer: {
      backgroundColor: colors.background.alternative,
      margin: 16,
      borderRadius: 12,
      padding: 16,
    },
    summaryTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
      marginBottom: 12,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    summaryLabel: {
      fontSize: 14,
      color: colors.text.muted,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.default,
    },
    successValue: {
      color: colors.success.default,
    },
    errorValue: {
      color: colors.error.default,
    },
    headerPlaceholder: {
      width: 32,
    },
  });
