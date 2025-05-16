import { StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../../../../util/theme/models';
/**
 * Style sheet function for BannerAlert component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (_params: {
  theme: Theme;
}) =>
  StyleSheet.create({
    attributionBase: {
      height: 40,
      marginTop: 8,
    } as ViewStyle,
    attributionItem: {
      marginRight: 4,
    },
    wrapper: {
      marginBottom: 10,
    },
    details: {
      marginLeft: 10,
    },
    detailsItem: {
      marginBottom: 4,
    },
  });

export default styleSheet;
