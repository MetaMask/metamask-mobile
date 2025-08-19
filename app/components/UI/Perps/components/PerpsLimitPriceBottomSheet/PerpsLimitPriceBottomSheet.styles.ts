import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      backgroundColor: colors.background.alternative,
    },
    priceInfo: {
      marginTop: 8,
      marginBottom: 16,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    priceLabel: {
      fontSize: 14,
      color: colors.text.alternative,
    },
    priceValue: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text.default,
    },
    limitPriceDisplay: {
      backgroundColor: colors.background.alternative,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 16,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    limitPriceValue: {
      fontSize: 32,
      fontWeight: '600',
      color: colors.text.default,
    },
    limitPriceCurrency: {
      fontSize: 18,
      color: colors.text.alternative,
    },
    percentageButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
      gap: 8,
    },
    percentageButton: {
      flex: 1,
      backgroundColor: colors.background.default,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border.muted,
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
