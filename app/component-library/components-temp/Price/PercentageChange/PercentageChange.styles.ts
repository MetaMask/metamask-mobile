// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';
import { fontStyles } from '../../../../styles/common';

/**
 * Style sheet function for PercentageChange component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    balancePositiveStyle: {
      color: colors.success.default,
      ...fontStyles.normal,
      textTransform: 'uppercase',
    },
    balanceNegativeStyle: {
      color: colors.error.default,
      ...fontStyles.normal,
      textTransform: 'uppercase',
    },
  });
};

export default styleSheet;
