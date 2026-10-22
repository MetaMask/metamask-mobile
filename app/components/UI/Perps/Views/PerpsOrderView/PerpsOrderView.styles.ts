import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';
import { FIXED_BOTTOM_CONTAINER_PADDING } from '../../constants/perpsUIConfig';

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
      paddingBottom: 0,
      paddingTop: 0,
    },
    scrollViewContentKeypad: {
      flexGrow: 0,
      paddingBottom: 0,
      paddingTop: 0,
    },
    fixedBottomContainer: {
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: FIXED_BOTTOM_CONTAINER_PADDING,
    },
    sliderSection: {
      paddingHorizontal: 32,
      paddingTop: 16,
      paddingBottom: 16,
    },
    detailsWrapper: {
      paddingHorizontal: 16,
      flex: 1,
      flexGrow: 1,
    },
    inputGroupContainer: {
      backgroundColor: colors.background.section,
      borderRadius: 12,
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
      paddingHorizontal: 16,
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
    keypad: {
      paddingHorizontal: 16,
      backgroundColor: colors.background.default,
    },
    pointsRightContainer: {
      alignItems: 'flex-end',
    },
  });
export default createStyles;
