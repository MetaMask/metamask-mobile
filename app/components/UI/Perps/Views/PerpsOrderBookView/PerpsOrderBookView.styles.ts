import { Platform, StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
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
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    headerBackButton: {
      marginRight: 12,
    },
    headerTitleContainer: {
      flex: 1,
    },
    // Header unit toggle (BTC/USD)
    headerUnitToggle: {
      flexDirection: 'row',
      marginRight: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border.default,
      overflow: 'hidden',
    },
    headerUnitButton: {
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    headerUnitButtonActive: {
      backgroundColor: colors.primary.default,
    },
    controlsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {},
    section: {
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    depthChartSection: {
      paddingTop: 16,
    },
    tableSection: {
      // No flex or minHeight - let content determine size
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: Platform.OS === 'ios' ? 16 : 0,
      backgroundColor: colors.background.default,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
    },
    spreadContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 12,
      gap: 4,
    },
    actionsContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    actionButtonWrapper: {
      flex: 1,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    spreadInfoContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 12,
      gap: 8,
    },
    midPriceText: {
      marginHorizontal: 8,
    },
    // Depth band dropdown button
    depthBandButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.background.muted,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    depthBandButtonPressed: {
      opacity: 0.7,
    },
    // Bottom sheet content
    depthBandSheetContent: {
    },
    depthBandOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
      minHeight: 56,
    },
    depthBandOptionSelected: {
      backgroundColor: colors.background.muted,
    },
  });
};

export default styleSheet;
