import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

export const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 4,
      marginBottom: 24,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 6,
    },
    tabActive: {
      backgroundColor: colors.background.default,
    },
    sizeDisplay: {
      alignItems: 'center',
      marginBottom: 8,
    },
    sizeAmount: {
      marginBottom: 4,
    },
    sliderContainer: {
      marginBottom: 32,
      paddingHorizontal: 8,
    },
    limitPriceSection: {
      marginBottom: 24,
    },
    limitPriceLabel: {
      marginBottom: 8,
    },
    limitPriceInput: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background.default,
    },
    limitPriceInputActive: {
      borderColor: colors.primary.default,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: colors.text.default,
      padding: 0,
      margin: 0,
    },
    detailsSection: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border.muted,
      marginVertical: 12,
    },
    receiveAmount: {
      alignItems: 'flex-end',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay.alternative,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingContainer: {
      backgroundColor: colors.background.default,
      borderRadius: 12,
      padding: 24,
      alignItems: 'center',
      shadowColor: colors.shadow.default,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    loadingText: {
      marginTop: 12,
    },
    warningContainer: {
      marginTop: 12,
      padding: 12,
      backgroundColor: colors.error.muted,
      borderRadius: 8,
    },
    warningText: {
      textAlign: 'center',
    },
  });
