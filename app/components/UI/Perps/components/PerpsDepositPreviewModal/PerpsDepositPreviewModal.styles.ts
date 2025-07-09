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
    iconContainer: {
      alignItems: 'center',
      flex: 1,
    },
    iconBackground: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    depositingLabel: {
      textAlign: 'center',
      marginBottom: 4,
    },
    amountText: {
      textAlign: 'center',
      fontSize: 32,
      fontWeight: '600',
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 16,
    },
    errorContainer: {
      padding: 16,
      backgroundColor: colors.error.muted,
      borderRadius: 8,
      marginBottom: 16,
    },
    detailsContainer: {
      paddingVertical: 16,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    lastDetailRow: {
      borderBottomWidth: 0,
    },
    detailLabel: {
      fontSize: 16,
    },
    detailValue: {
      fontSize: 16,
      fontWeight: '500',
    },
    buttonContainer: {
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
  });
