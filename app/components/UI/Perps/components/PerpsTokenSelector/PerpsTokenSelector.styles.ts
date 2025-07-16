import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

export const createStyles = (colors: Colors) =>
  StyleSheet.create({
    modal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    container: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '80%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      width: 24,
      height: 24,
    },
    placeholder: {
      width: 24,
      height: 24,
    },
    tokenList: {
      paddingHorizontal: 24,
    },
    tokenItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    lastTokenItem: {
      borderBottomWidth: 0,
    },
    tokenIcon: {
      marginRight: 12,
    },
    tokenInfo: {
      flex: 1,
    },
    tokenTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    tokenSymbol: {
      marginRight: 8,
    },
    networkName: {
      opacity: 0.7,
    },
    tokenName: {
      opacity: 0.7,
    },
    tokenBalance: {
      alignItems: 'flex-end',
    },
    selectedIndicator: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primary.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    emptyState: {
      padding: 32,
      alignItems: 'center',
    },
    networkFilterContainer: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
      paddingVertical: 8,
    },
    networkFilterScroll: {
      flexGrow: 0,
    },
    networkFilterContent: {
      paddingHorizontal: 24,
      gap: 8,
    },
    networkFilterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border.muted,
      backgroundColor: colors.background.alternative,
      marginRight: 8,
      gap: 6,
    },
    networkFilterChipSelected: {
      borderColor: colors.primary.default,
      backgroundColor: colors.primary.muted,
    },
    networkFilterText: {
      fontSize: 12,
    },
  });
