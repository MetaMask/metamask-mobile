// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

/**
 * Style sheet input parameters.
 */
export interface ButtonPillStyleSheetVars {
  isDisabled: boolean;
  isPressed: boolean;
}

/**
 * Style sheet function for ButtonPill component
 *
 * @param params Style sheet params
 * @param params.theme Theme object
 * @param params.vars Arbitrary inputs this style sheet depends on
 * @returns StyleSheet object
 */
const styleSheet = (params: {
  theme: Theme;
  vars: ButtonPillStyleSheetVars;
}) => {
  const {
    theme: { colors },
    vars: { isPressed }
  } = params;

  return StyleSheet.create({
    base: {
      backgroundColor: colors.background.alternative,
      color: colors.text.default,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 99,
      ...(isPressed && {
        backgroundColor: colors.background.alternativePressed,
      }),
    },
  });
};

export default styleSheet;
