import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
    },
    inputLabel: {
      fontSize: 14,
      color: colors.text.alternative,
      marginTop: 12,
      marginBottom: 8,
    },
    limitPriceDisplay: {
      backgroundColor: colors.background.section,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border.muted,
      minHeight: 48,
    },
    limitPriceValue: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text.default,
      flex: 1,
    },
    limitPriceCurrency: {
      fontSize: 16,
      color: colors.text.alternative,
      marginLeft: 8,
    },
    marketPriceText: {
      fontSize: 14,
      color: colors.text.alternative,
      marginBottom: 16,
    },
    percentageButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
      gap: 10,
    },
    percentageButton: {
      flex: 1,
      backgroundColor: colors.background.section,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 4,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border.muted,
      minWidth: 0,
    },
    percentageButtonActive: {
      backgroundColor: colors.primary.muted,
      borderColor: colors.primary.default,
    },
    keypadContainer: {
      marginBottom: 16,
    },
    footerContainer: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
  });
