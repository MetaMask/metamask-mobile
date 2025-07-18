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
    track: {
      flex: 1,
      height: 6,
      backgroundColor: colors.border.muted,
      borderRadius: 3,
      position: 'relative',
    },
    progress: {
      height: 6,
      backgroundColor: colors.success.default,
      borderRadius: 3,
      position: 'absolute',
      left: 0,
      top: 0,
    },
    thumb: {
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
    percentageRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 0,
    },
    percentageText: {
      color: colors.text.muted,
      fontSize: 12,
      fontWeight: '500',
    },
  });
};

export default styleSheet;
