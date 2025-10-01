import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

/**
 * Styles for RewardPointsAnimation component
 *
 * @param params.theme - App theme from ThemeContext
 * @param params.vars.height - Rive icon height
 * @param params.vars.width - Rive icon width
 * @param params.vars.isErrorState - Whether component is in error state
 */
const createRewardPointsAnimationStyles = (params: {
  theme: Theme;
  vars: {
    height: number;
    width: number;
    isErrorState: boolean;
    containerWidth?: number;
  };
}) => {
  const {
    theme: { colors },
    vars: { height, width, isErrorState },
  } = params;

  return StyleSheet.create({
    outerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    container: {
      flexDirection: 'row',
      position: 'relative',
      alignItems: 'center',
      // Pre-calculate width based on target value to prevent jittering
      // TODO: This solution doesn't quite work, although it stops the jittering the set width interferes with the parent layout
      // width: isErrorState ? '100%' : containerWidth,
    },
    riveIcon: {
      width,
      height,
      position: 'absolute',
      zIndex: 2,
      left: 0,
    },
    counterText: {
      color: isErrorState ? colors.text.alternative : colors.text.default,
      marginLeft: 2,
      textAlign: 'right',
    },
    infoIconContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoIcon: {
      marginLeft: 4,
      color: colors.text.alternative,
    },
  });
};

export default createRewardPointsAnimationStyles;
