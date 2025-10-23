import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

export const createStyles = (theme: Theme) => {
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    backButton: {
      padding: 8,
      marginRight: 8,
    },
    headerContent: {
      flex: 1,
    },
    content: {
      flex: 1,
    },
    scrollViewContent: {
      paddingBottom: 20,
    },
    scrollViewContentWithKeypad: {
      paddingBottom: 100,
    },
    positionSizeInfo: {
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    toggleContainer: {
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 0,
      paddingBottom: 8,
    },
    toggleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 4,
      paddingVertical: 4,
    },
    sliderSection: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    detailsWrapper: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    detailItem: {
      marginBottom: 8,
      backgroundColor: colors.background.section,
      borderRadius: 8,
      overflow: 'hidden',
    },
    detailsSection: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    labelWithTooltip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    totalRow: {
      marginTop: 12,
      paddingTop: 20,
      borderTopColor: colors.border.muted,
      borderTopWidth: 1,
    },
    validationSection: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    errorMessage: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.error.muted,
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    warningMessage: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.warning.muted,
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    footer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 12,
    },
    footerWithSummary: {
      paddingTop: 0,
    },
    summaryContainer: {
      paddingTop: 16,
      paddingBottom: 16,
      gap: 4,
    },
    paddingHorizontal: {
      paddingHorizontal: 16,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 4,
    },
    summaryLabel: {
      flex: 1,
    },
    summaryValue: {
      flexShrink: 0,
      alignItems: 'flex-end',
    },
    summaryTotalRow: {
      marginTop: 4,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
    },
    bottomSection: {
      paddingTop: 16,
    },
    percentageButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginBottom: 12,
      gap: 8,
    },
    percentageButton: {
      flex: 1,
    },
    keypad: {
      paddingHorizontal: 16,
    },
    marketButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.background.muted,
    },
    marketButtonIcon: {
      marginLeft: 2,
    },
    detailListItem: {
      borderRadius: 12,
    },
    detailLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    infoIcon: {
      marginLeft: 0,
      padding: 10, // Increases touch target from 20x20 to 40x40 for better accessibility
      marginRight: -6, // Compensate for padding to keep visual alignment
      marginTop: -10, // Keep icon at same vertical position
      marginBottom: -10, // Keep icon at same vertical position
    },
    merginAmountContainer: {
      alignItems: 'flex-end',
    },
    inclusiveFeeRow: {
      flexDirection: 'row',
      gap: 4,
    },
  });
};
