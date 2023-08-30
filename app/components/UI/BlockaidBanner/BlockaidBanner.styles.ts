// Third party dependencies.
import { Theme } from '../../../util/theme/models';
import { StyleSheet, ViewStyle } from 'react-native';
import { BlockaidBannerStyleSheetVars } from './BlockaidBanner.types';
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
  vars: BlockaidBannerStyleSheetVars;
}) =>
  StyleSheet.create({
    attributionBase: Object.assign({
      height: 24,
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    } as ViewStyle),
    attributionItem: {
      marginRight: 4,
    },
    detailsItem: {
      marginBottom: 4,
    },
    details: { marginLeft: 10, marginBottom: 10 },
    securityTickIcon: { marginTop: 4 },
  });

export default styleSheet;
