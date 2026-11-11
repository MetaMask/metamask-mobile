import { StyleSheet } from 'react-native';
import { getFontSizeForInputLength } from '../../../../../../component-library/components-temp/AnimatedAmountDisplay';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { amountLength: number; hasAlert: boolean; disabled: boolean };
}) => {
  const fontSize = getFontSizeForInputLength(params.vars.amountLength);

  return StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 88,
    },
    input: {
      textAlign: 'center',
      fontSize,
      lineHeight: fontSize,
      color: params.vars.hasAlert
        ? params.theme.colors.error.default
        : params.vars.disabled
          ? params.theme.colors.text.muted
          : params.theme.colors.text.default,
    },
    assistive: {
      color: params.theme.colors.text.muted,
    },
    alertMessage: {
      textAlign: 'center',
      marginTop: 16,
      color: params.theme.colors.error.default,
    },
  });
};

export default styleSheet;
