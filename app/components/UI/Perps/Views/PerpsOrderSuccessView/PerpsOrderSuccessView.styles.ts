import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

export const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    content: {
      flex: 1,
      padding: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.success.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    successIconText: {
      fontSize: 40,
      color: colors.background.default,
    },
    title: {
      marginBottom: 12,
      textAlign: 'center',
    },
    subtitle: {
      textAlign: 'center',
      marginBottom: 32,
    },
    orderDetails: {
      backgroundColor: colors.background.alternative,
      borderRadius: 12,
      padding: 20,
      marginBottom: 32,
      width: '100%',
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    detailLabel: {
      color: colors.text.muted,
    },
    detailValue: {
      fontWeight: '600',
    },
    directionText: {
      textTransform: 'capitalize',
    },
    buttonContainer: {
      width: '100%',
      gap: 16,
    },
  });
