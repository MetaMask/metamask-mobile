import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    leverageDisplay: {
      alignItems: 'center',
      paddingTop: 16,
      paddingBottom: 24,
    },
    leverageText: {
      fontSize: 48,
      fontWeight: '600',
      lineHeight: 56,
    },
    leverageTextLow: {
      color: colors.text.default,
    },
    leverageTextMedium: {
      color: colors.warning.default,
    },
    leverageTextHigh: {
      color: colors.error.default,
    },
    warningContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      marginBottom: 24,
    },
    warningIcon: {
      marginRight: 8,
    },
    warningTextLow: {
      color: colors.text.alternative,
    },
    warningTextMedium: {
      color: colors.warning.default,
    },
    warningTextHigh: {
      color: colors.error.default,
    },
    priceInfoContainer: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 16,
      marginBottom: 32,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    sliderContainer: {
      marginBottom: 16,
    },
    sliderLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    quickSelectButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 24,
      marginBottom: 16,
    },
    quickSelectButton: {
      flex: 1,
      marginHorizontal: 4,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    quickSelectButtonActive: {
      backgroundColor: colors.primary.muted,
      borderColor: colors.primary.default,
    },
    quickSelectText: {
      fontWeight: '500',
    },
    leverageSliderContainer: {
      paddingVertical: 8,
    },
    leverageTrack: {
      height: 6,
      backgroundColor: colors.border.muted,
      borderRadius: 3,
      position: 'relative',
    },
    leverageThumb: {
      width: 24,
      height: 24,
      backgroundColor: colors.background.default,
      borderRadius: 12,
      position: 'absolute',
      top: -9,
      left: -12,
      shadowColor: colors.shadow.default,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
      borderWidth: 2,
      borderColor: colors.border.default,
    },
    leverageGradient: {
      flex: 1,
      borderRadius: 3,
    },
    progressContainer: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
      position: 'absolute',
      left: 0,
      top: 0,
    },
    gradientStyle: {
      height: 6,
      borderRadius: 3,
    },
    emptyPriceInfo: {
      textAlign: 'center',
      paddingVertical: 16,
    },
    tickMark: {
      position: 'absolute',
      width: 4,
      height: 4,
      backgroundColor: colors.border.muted,
      borderRadius: 2,
      top: 1,
    },
  });
