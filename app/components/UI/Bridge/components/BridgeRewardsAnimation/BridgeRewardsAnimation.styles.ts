import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const ICON_WIDTH = 16;
const ICON_HEIGHT = 16;

export const bridgeRewardsAnimationStyles = (params: {
  theme: Theme;
  vars: {
    isErrorState: boolean;
    iconPosition: number;
  };
}) => {
  const {
    theme: { colors },
    vars: { isErrorState, iconPosition },
  } = params;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      position: 'relative',
      alignItems: 'center',
      minHeight: ICON_HEIGHT,
    },
    riveIcon: {
      position: 'absolute',
      zIndex: 2,
      left: iconPosition, // Dynamic: 0 (loading) or -20 (idle)
    },
    riveSize: {
      width: ICON_WIDTH,
      height: ICON_HEIGHT,
    },
    textContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      // Text starts after icon + gap
      // Loading: icon at 0-16px, text at 20px (4px gap)
      // Idle: icon at -20 to -4px, text at 0px (4px gap)
      marginLeft: iconPosition + ICON_WIDTH + 4,
    },
    counterText: {
      color: isErrorState ? colors.text.alternative : colors.text.default,
    },
  });
};
