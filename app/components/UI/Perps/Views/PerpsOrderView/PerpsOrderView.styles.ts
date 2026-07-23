import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      flexGrow: 1,
      paddingBottom: 120, // Space for fixed button
      paddingTop: 0,
    },
    scrollViewContentKeypad: {
      flexGrow: 0,
      paddingBottom: 0,
      paddingTop: 0,
    },
    fixedBottomContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.background.default,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    sliderSection: {
      paddingHorizontal: 32,
      paddingTop: 32,
      paddingBottom: 24,
    },
    detailsWrapper: {
      paddingHorizontal: 16,
      flex: 1,
      flexGrow: 1,
    },
    inputGroupContainer: {
      backgroundColor: colors.background.section,
      borderRadius: 12,
      paddingHorizontal: 12,
      overflow: 'hidden',
    },
    detailLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    infoIcon: {
      marginLeft: 0,
      padding: 10,
      marginRight: -6,
      marginTop: -10,
      marginBottom: -10,
    },
    infoSection: {
      paddingHorizontal: 16,
      borderRadius: 12,
    },
    infoSectionSpacer: {
      flex: 1,
      minHeight: 16,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    stopLossLiquidationWarning: {
      paddingHorizontal: 8,
      paddingTop: 8,
    },
    validationContainer: {
      marginBottom: 12,
    },
    insufficientPayTokenWarning: {
      backgroundColor: colors.warning.muted,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      marginTop: 12,
    },
    bottomSection: {
      paddingVertical: 24,
    },
    percentageButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingBottom: 12,
      gap: 8,
      paddingHorizontal: 16,
    },
    percentageButton: {
      flex: 1,
      minWidth: 0,
    },
    keypad: {
      paddingHorizontal: 16,
      backgroundColor: colors.background.default,
    },
    pointsRightContainer: {
      alignItems: 'flex-end',
    },
  });
export default createStyles;
