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
    sliderSection: {
      paddingHorizontal: 24,
      paddingBottom: 24,
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
    infoIcon: {
      marginLeft: 8,
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
    validationContainer: {
      marginBottom: 12,
    },
    bottomSection: {
      paddingHorizontal: 24,
      paddingVertical: 24,
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
  });

export default createStyles;
