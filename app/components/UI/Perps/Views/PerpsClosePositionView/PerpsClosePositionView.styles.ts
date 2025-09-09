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
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      overflow: 'hidden',
    },
    detailsSection: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
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
      marginTop: 8,
      paddingTop: 8,
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
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
    },
    bottomSection: {
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
      paddingTop: 16,
    },
    percentageButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    percentageButton: {
      flex: 1,
      marginHorizontal: 4,
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
  });
};
