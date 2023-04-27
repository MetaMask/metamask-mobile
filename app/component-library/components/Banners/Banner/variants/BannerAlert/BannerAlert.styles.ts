// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import {
  BannerAlertSeverity,
  BannerAlertStyleSheetVars,
} from './BannerAlert.types';

/**
 * Style sheet function for BannerAlert component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: BannerAlertStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { style, severity } = vars;

  let colorObj;

  switch (severity) {
    case BannerAlertSeverity.Info:
      colorObj = theme.colors.info;
      break;
    case BannerAlertSeverity.Success:
      colorObj = theme.colors.success;
      break;
    case BannerAlertSeverity.Error:
      colorObj = theme.colors.error;
      break;
    case BannerAlertSeverity.Warning:
      colorObj = theme.colors.warning;
      break;
    default:
      colorObj = theme.colors.info;
      break;
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        borderLeftWidth: 4,
        borderColor: colorObj.default,
        backgroundColor: colorObj.muted,
        paddingLeft: 8,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    severityIcon: {
      color: colorObj.default,
    },
  });
};

export default styleSheet;
