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
      gap: 8,
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
    headerPriceChange: {
      fontSize: 14,
    },
    marketButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.background.alternative,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    tokenIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
  });
