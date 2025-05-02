import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

/**
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const {
    theme: { colors },
  } = params;
  return StyleSheet.create({
    emptyView: {
      backgroundColor: colors.background.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 180,
    },
    emptyViewText: {
      fontFamily: 'EuclidCircularB-Medium',
    },
  });
};

export default styleSheet;
