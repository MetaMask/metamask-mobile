/* eslint-disable react-native/no-color-literals */
/* eslint-disable @metamask/design-tokens/color-no-hex */
import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';
import {
  LEVERAGE_COLORS,
  LEVERAGE_BACKGROUND_COLORS,
} from '../../constants/leverageColors';

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
      marginHorizontal: 12,
    },
    leverageText: {
      fontSize: 48,
      fontWeight: '600',
      lineHeight: 56,
    },
    leverageTextSafe: {
      color: LEVERAGE_COLORS.SAFE, // Green - safe leverage
    },
    leverageTextCaution: {
      color: LEVERAGE_COLORS.CAUTION, // Yellow - moderate leverage
    },
    leverageTextLow: {
      color: colors.text.default,
    },
    leverageTextMedium: {
      color: LEVERAGE_COLORS.MEDIUM, // Orange - high leverage
    },
    leverageTextHigh: {
      color: colors.error.default, // Red - dangerous leverage
    },
    warningContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      marginBottom: 24,
      marginHorizontal: 12
    },
    warningContainerSafe: {
      backgroundColor: LEVERAGE_BACKGROUND_COLORS.SAFE, // Green background
    },
    warningContainerCaution: {
      backgroundColor: LEVERAGE_BACKGROUND_COLORS.CAUTION, // Yellow background
    },
    warningContainerMedium: {
      backgroundColor: LEVERAGE_BACKGROUND_COLORS.MEDIUM, // Orange background
    },
    warningContainerHigh: {
      backgroundColor: LEVERAGE_BACKGROUND_COLORS.HIGH, // Red background
    },
    warningIcon: {
      marginRight: 8,
      flexShrink: 0,
    },
    warningText: {
      flex: 1,
      flexWrap: 'wrap',
    },
    warningTextSafe: {
      color: LEVERAGE_COLORS.SAFE, // Green - matches gradient start
    },
    warningTextCaution: {
      color: LEVERAGE_COLORS.CAUTION, // Yellow - matches gradient middle
    },
    warningTextLow: {
      color: colors.text.alternative,
    },
    warningTextMedium: {
      color: LEVERAGE_COLORS.MEDIUM, // Orange - matches gradient
    },
    warningTextHigh: {
      color: colors.error.default, // Red - matches gradient end
    },
    priceInfoContainer: {
      borderRadius: 8,
      marginBottom: 32,
      marginHorizontal: 12,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    priceValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    priceIcon: {
      marginRight: 4,
    },
    sliderContainer: {
      marginBottom: 16,
      marginHorizontal: 12,
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
      backgroundColor: colors.background.section,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    quickSelectButtonActive: {
      backgroundColor: colors.icon.default,
      borderColor: colors.icon.default,
    },
    quickSelectText: {
      fontWeight: '500',
    },
    leverageSliderContainer: {
      paddingVertical: 8,
    },
    leverageTrack: {
      height: 8,
      backgroundColor: colors.border.muted,
      borderRadius: 20,
      position: 'relative',
    },
    leverageThumb: {
      width: 32,
      height: 32,
      backgroundColor: colors.icon.alternative,
      borderRadius: 16,
      position: 'absolute',
      top: -13,
      left: -16,
      elevation: 4,
      borderWidth: 4,
      borderColor: colors.icon.default,
    },
    leverageGradient: {
      flex: 1,
      borderRadius: 3,
    },
    progressContainer: {
      height: 8,
      borderRadius: 20,
      overflow: 'hidden',
      position: 'absolute',
      left: 0,
      top: 0,
    },
    gradientStyle: {
      height: 8,
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
      top: 2,
    },
  });
