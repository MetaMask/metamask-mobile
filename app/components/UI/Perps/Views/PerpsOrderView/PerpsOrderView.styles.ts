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
      paddingTop: 32,
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
      paddingHorizontal: 32,
      paddingTop: 32,
      paddingBottom: 24,
    },
    detailsWrapper: {
      paddingHorizontal: 16,
      flex: 1,
      flexGrow: 1,
      gap: 2,
    },
    detailItem: {
      backgroundColor: colors.background.section,
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
      marginLeft: 0,
      padding: 10, // Increases touch target from 20x20 to 40x40 for better accessibility
      marginRight: -6, // Compensate for padding to keep visual alignment
      marginTop: -10, // Keep icon at same vertical position
      marginBottom: -10, // Keep icon at same vertical position
    },
    infoSection: {
      paddingHorizontal: 16,
      borderRadius: 12,
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
      paddingVertical: 24,
    },
    percentageButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 8,
      gap: 8,
    },
    percentageButton: {
      flex: 1,
      minWidth: 0, // Ensures buttons can shrink properly
    },
    keypad: {
      paddingHorizontal: 16,
      backgroundColor: colors.background.default,
    },
  });
export default createStyles;
