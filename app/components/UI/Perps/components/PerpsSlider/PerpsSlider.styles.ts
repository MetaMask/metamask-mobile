import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      paddingVertical: 8,
    },
    sliderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    trackContainer: {
      flex: 1,
      position: 'relative',
      paddingBottom: 30,
    },
    track: {
      height: 6,
      backgroundColor: colors.border.muted,
      borderRadius: 3,
      position: 'relative',
    },
    progress: {
      height: 6,
      backgroundColor: colors.primary.default,
      borderRadius: 3,
      position: 'absolute',
      left: 0,
      top: 0,
    },
    thumb: {
      width: 28,
      height: 28,
      backgroundColor: colors.background.default,
      borderRadius: 14,
      position: 'absolute',
      top: -11,
      left: -14,
      shadowColor: colors.shadow.default,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 4,
      borderWidth: 2,
      borderColor: colors.border.default,
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
      transform: [{ translateX: -20 }],
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
      width: 5,
      height: 5,
      backgroundColor: colors.text.muted,
      borderRadius: 2.5,
      position: 'absolute',
      top: 0.5,
      transform: [{ translateX: -2.5 }],
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
    percentageText: {
      color: colors.text.muted,
      fontSize: 12,
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
