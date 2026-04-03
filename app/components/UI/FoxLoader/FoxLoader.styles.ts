// Third party dependencies.
import { StyleSheet, Dimensions } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Style sheet function for FoxLoader component.
 *
 * @param params Style sheet params.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      backgroundColor: colors.background.default,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    animationWrapper: {
      alignItems: 'center',
      width: screenWidth * 0.5,
      height: screenWidth * 0.5,
    },
    riveAnimation: {
      width: screenWidth * 0.5,
      height: screenWidth * 0.5,
    },
    image: {
      width: 72,
      height: 72,
    },
    hidden: {
      opacity: 0,
    },
    spacer: {
      marginVertical: 16,
    },
  });
};

export default styleSheet;
