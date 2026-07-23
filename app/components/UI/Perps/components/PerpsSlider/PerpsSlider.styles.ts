import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

interface PerpsSliderStyleVars {
  showPercentageLabels: boolean;
  variant: 'default' | 'compact';
}

const styleSheet = (params: { theme: Theme; vars: PerpsSliderStyleVars }) => {
  const { theme, vars } = params;
  const { colors } = theme;
  const isCompact = vars.variant === 'compact';
  const trackHeight = isCompact ? 4 : 8;
  const thumbSize = isCompact ? 16 : 32;

  return StyleSheet.create({
    container: {
      paddingTop: isCompact ? 16 : 8,
      paddingBottom: isCompact ? 12 : 8,
    },
    sliderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: isCompact ? 0 : 16,
    },
    trackContainer: {
      flex: 1,
      position: 'relative',
      paddingBottom: vars.showPercentageLabels ? 30 : 0,
    },
    track: {
      height: trackHeight,
      backgroundColor: colors.border.muted,
      borderRadius: 20,
      position: 'relative',
    },
    progress: {
      height: trackHeight,
      backgroundColor: colors.icon.alternative,
      borderRadius: 20,
      position: 'absolute',
      left: 0,
      top: 0,
    },
    thumb: {
      width: thumbSize,
      height: thumbSize,
      backgroundColor: colors.icon.defaultPressed,
      borderRadius: thumbSize / 2,
      position: 'absolute',
      top: (trackHeight - thumbSize) / 2,
      left: -thumbSize / 2,
      elevation: 4,
      borderColor: colors.icon.default,
    },
    percentageRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 0,
      position: 'relative',
      marginTop: 8,
      minHeight: 20,
    },
    percentageWrapper: {
      position: 'absolute',
      top: 14,
      alignItems: 'center',
      transform: [{ translateX: -15 }],
    },
    percentageWrapper0: {
      left: 0,
      transform: [{ translateX: 0 }],
    },
    percentageWrapper25: {
      left: '25%',
    },
    percentageWrapper50: {
      left: '50%',
    },
    percentageWrapper75: {
      left: '75%',
    },
    percentageWrapper100: {
      right: 0,
      left: 'auto',
      transform: [{ translateX: 0 }],
    },
    percentageDot: {
      width: 4,
      height: 4,
      backgroundColor: colors.text.muted,
      borderRadius: 2.5,
      position: 'absolute',
      top: isCompact ? 0 : 2,
      transform: [{ translateX: -2.5 }],
      zIndex: -2,
    },
    percentageDot0: {
      left: '2%',
    },
    percentageDot25: {
      left: '25%',
    },
    percentageDot50: {
      left: '50%',
    },
    percentageDot75: {
      left: '75%',
    },
    percentageDot100: {
      left: '98%',
    },
    percentageText: {
      marginTop: 8,
      color: colors.text.alternative,
      fontSize: 14,
      fontWeight: '500',
    },
    quickValuesRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 8,
    },
    quickValueButton: {
      padding: 8,
      backgroundColor: colors.background.alternative,
    },
    gradientProgress: {
      flex: 1,
      borderRadius: 3,
    },
  });
};

export default styleSheet;
