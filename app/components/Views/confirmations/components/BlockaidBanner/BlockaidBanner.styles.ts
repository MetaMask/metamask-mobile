// Third party dependencies.
import { Theme } from '../../../../../util/theme/models';
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
      marginTop: 8,
    } as ViewStyle),
    attributionItem: {
      marginRight: 4,
    },
    detailsItem: {
      marginBottom: 4,
    },
    details: { marginLeft: 10, marginBottom: 10 },
    bannerWrapperMargined: {
      marginTop: 10,
      marginLeft: 10,
      marginRight: 10,
      marginBottom: 20,
    },
    bannerSectionSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 4,
      borderColor: _params.theme.colors.border.default,
      marginTop: 20,
      marginLeft: 10,
      marginRight: 10,
      marginBottom: 20,
      padding: 10,
    },
    bannerSectionSmallSpaced: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      borderWidth: 1,
      borderRadius: 4,
      borderColor: _params.theme.colors.border.default,
      marginTop: 20,
      marginLeft: 10,
      marginRight: 10,
      marginBottom: 20,
      padding: 10,
    },
    infoText: {
      marginHorizontal: 5,
    },
    flexRowSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 10,
    },
  });

export default styleSheet;
