import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    backButton: {
      marginRight: 16,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      color: colors.text.default,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 4,
    },
    headerPrice: {
      color: colors.text.muted,
      fontSize: 16,
      fontWeight: '500',
    },
    headerPriceChange: {
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 4,
    },
    headerPriceChangePositive: {
      color: colors.success.default,
    },
    headerPriceChangeNegative: {
      color: colors.error.default,
    },
    headerRight: {
      alignItems: 'flex-end',
    },
    content: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      flexGrow: 1,
      paddingBottom: 120, // Space for fixed button
    },
    fixedBottomContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.background.default,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 32,
    },
    priceSection: {
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 24,
    },
    priceText: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.text.default,
      marginBottom: 4,
    },
    priceChangeText: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 16,
    },
    marketBadge: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    marketBadgeText: {
      color: colors.text.muted,
      fontSize: 14,
      fontWeight: '500',
    },
    amountSection: {
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 24,
    },
    amountText: {
      fontSize: 48,
      fontWeight: '300',
      color: colors.text.default,
      marginBottom: 8,
    },
    btcAmountText: {
      fontSize: 16,
      color: colors.text.muted,
    },
    marginSection: {
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    sliderContainer: {
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    orderDetails: {
      paddingHorizontal: 24,
    },
    sliderSection: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    detailsSection: {
      paddingHorizontal: 0,
      backgroundColor: colors.background.default,
    },
    detailsWrapper: {
      paddingHorizontal: 16,
      gap: 2,
    },
    detailItem: {
      backgroundColor: colors.background.alternative,
      overflow: 'hidden',
    },
    detailItemFirst: {
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    },
    detailItemLast: {
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    },
    detailLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    detailRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    infoIcon: {
      marginLeft: 8,
    },
    payWithRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    payWithText: {
      marginLeft: 8,
    },
    tokenIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.primary.default,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    tokenIconText: {
      color: colors.primary.inverse,
      fontSize: 12,
      fontWeight: '600',
    },
    assetIconContainer: {
      width: 20,
      height: 20,
      marginRight: 8,
    },
    assetIcon: {
      width: 20,
      height: 20,
    },
    networkBadge: {
      width: 16,
      height: 16,
    },
    tokenIconContainer: {
      width: 24,
      height: 24,
      marginRight: 8,
    },
    infoSection: {
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    infoLabel: {
      fontSize: 14,
      color: colors.text.muted,
    },
    infoValue: {
      fontSize: 14,
      color: colors.text.muted,
    },
    footer: {
      padding: 24,
      paddingBottom: 32,
    },
    validationContainer: {
      marginBottom: 12,
    },
    errorText: {
      fontSize: 14,
      color: colors.error.default,
      marginBottom: 4,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    detailLabel: {
      fontSize: 16,
      color: colors.text.default,
    },
    detailValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
    },
    leverageContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    leverageButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border.muted,
      backgroundColor: colors.background.default,
    },
    leverageButtonSelected: {
      backgroundColor: colors.primary.default,
      borderColor: colors.primary.default,
    },
    leverageButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.muted,
    },
    leverageButtonTextSelected: {
      color: colors.primary.inverse,
    },
    addButton: {
      color: colors.primary.default,
      fontSize: 16,
      fontWeight: '600',
    },
    actionButton: {
      marginLeft: 8,
    },
    amountInput: {
      fontSize: 48,
      fontWeight: '300',
      color: colors.text.default,
      textAlign: 'center',
      backgroundColor: colors.background.default,
      padding: 0,
      margin: 0,
      minHeight: 60,
    },
    amountInputWithDollar: {
      fontSize: 48,
      fontWeight: '300',
      color: colors.text.default,
      textAlign: 'center',
      backgroundColor: colors.background.default,
      padding: 0,
      margin: 0,
      minHeight: 60,
    },
    bottomSection: {
      paddingHorizontal: 24,
      paddingVertical: 24,
    },
    bottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    bottomLabel: {
      fontSize: 16,
      color: colors.text.muted,
    },
    bottomValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
    },
    placeOrderButton: {
      backgroundColor: colors.primary.default,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginHorizontal: 24,
      marginBottom: 24,
    },
    placeOrderButtonDisabled: {
      backgroundColor: colors.background.alternative,
    },
    placeOrderButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary.inverse,
    },
    placeOrderButtonTextDisabled: {
      color: colors.text.muted,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailRowContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    directionButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border.muted,
      backgroundColor: colors.background.default,
      marginRight: 8,
    },
    directionButtonSelected: {
      backgroundColor: colors.primary.default,
      borderColor: colors.primary.default,
    },
    directionButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.muted,
    },
    directionButtonTextSelected: {
      color: colors.primary.inverse,
    },
    marginLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.background.alternative + '80',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: colors.background.default,
      padding: 24,
      borderRadius: 12,
      width: '80%',
    },
    modalTitle: {
      color: colors.text.default,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 16,
    },
    modalOption: {
      padding: 12,
      marginBottom: 8,
    },
    modalOptionSelected: {
      backgroundColor: colors.primary.default,
      borderRadius: 8,
    },
    modalOptionText: {
      color: colors.text.default,
    },
    modalOptionTextSelected: {
      color: colors.primary.inverse,
    },
    modalCancel: {
      padding: 8,
      marginTop: 8,
    },
    modalCancelText: {
      color: colors.text.muted,
      textAlign: 'center',
    },
    // Debug Panel Styles
    debugPanel: {
      backgroundColor: colors.background.alternative,
      marginHorizontal: 24,
      marginBottom: 16,
      padding: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    debugPanelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    debugPanelTitle: {
      color: colors.text.default,
      fontSize: 16,
      fontWeight: '600',
    },
    debugToggle: {
      color: colors.primary.default,
      fontSize: 14,
      fontWeight: '500',
    },
    debugRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    debugLabel: {
      color: colors.text.default,
      fontSize: 14,
    },
    debugButton: {
      backgroundColor: colors.primary.default,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      marginHorizontal: 4,
    },
    debugButtonText: {
      color: colors.primary.inverse,
      fontSize: 12,
      fontWeight: '500',
    },
    debugTestButton: {
      backgroundColor: colors.warning.default,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginVertical: 4,
    },
    debugTestButtonText: {
      color: colors.warning.inverse,
      fontSize: 14,
      fontWeight: '600',
    },
    debugButtonRow: {
      flexDirection: 'row',
    },
    tooltipSection: {
      marginTop: 16,
    },
    tooltipItem: {
      marginBottom: 8,
    },
    percentageButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      marginBottom: 16,
      gap: 12,
    },
    percentageButton: {
      flex: 1,
    },
    keypad: {
      backgroundColor: colors.background.default,
    },
    tooltipContent: {
      paddingBottom: 16,
    },
    tooltipButtonContainer: {
      paddingTop: 8,
      paddingBottom: 8,
    },
    tooltipFeeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      width: '100%',
    },
    tooltipFeesContainer: {
      width: '100%',
    },
  });

export default createStyles;
