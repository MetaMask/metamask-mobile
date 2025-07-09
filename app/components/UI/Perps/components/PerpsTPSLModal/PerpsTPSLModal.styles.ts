import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

export const createStyles = (colors: Colors) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay.default,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
      minHeight: 400,
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
    priceList: {
      flex: 1,
      paddingHorizontal: 24,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    markPriceRow: {
      backgroundColor: colors.background.alternative,
    },
    priceText: {
      fontSize: 16,
    },
    markPriceText: {
      fontWeight: '600',
    },
    markPriceLabel: {
      color: colors.text.muted,
      fontSize: 14,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    tpButton: {
      backgroundColor: colors.success.default,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      minWidth: 80,
      alignItems: 'center',
    },
    slButton: {
      backgroundColor: colors.error.default,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      minWidth: 80,
      alignItems: 'center',
    },
    selectedButton: {
      opacity: 1,
    },
    unselectedButton: {
      opacity: 0.3,
    },
    buttonText: {
      color: colors.primary.inverse,
      fontSize: 12,
      fontWeight: '600',
    },
    footer: {
      padding: 24,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
    },
  });
