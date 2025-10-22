import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
      flexDirection: 'column',
      justifyContent: 'center',
    },
    spacer: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      flexGrow: 1,
    },
    stakeButtonText: {
      fontSize: 18,
      color: colors.text.alternative,
    },
    rewardsRateContainer: {
      padding: 16,
      paddingBottom: 8,
      borderColor: colors.border.muted,
    },
    reviewButtonContainer: {
      padding: 16,
    },
    keypad: {
      paddingHorizontal: 16,
    },

    toggleContainer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      marginBottom: 8,
    },
    toggleGroup: {
      position: 'relative',
      width: '100%',
      alignSelf: 'stretch',
      backgroundColor: colors.background.alternative,
      borderRadius: 16,
      padding: 6,
      borderWidth: 1,
      borderColor: colors.border.muted,
      overflow: 'hidden',
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    toggleButtonWrapper: {
      flex: 1,
    },
    toggleButtonBase: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    toggleSlider: {
      position: 'absolute',
      top: 4,
      left: 3,
      bottom: 4,
      borderRadius: 12,
      backgroundColor: colors.background.default,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
  });
};

export default styleSheet;
