import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    headerLeft: {
      flex: 1,
      marginLeft: 12,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerCenterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      fontSize: 18,
    },
    marketButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.background.muted,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    marketButtonIcon: {
      marginLeft: 2,
    },
    tokenIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
  });
