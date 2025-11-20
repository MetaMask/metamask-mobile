import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

function getFontSize(length: number) {
  if (length <= 8) return 64;
  if (length <= 13) return 40;
  if (length <= 18) return 30;
  return 20;
}

const styleSheet = (params: {
  theme: Theme;
  vars: { amountLength: number; hasAlert: boolean; disabled: boolean };
}) =>
  StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 70,
      gap: 5,
    },
    input: {
      textAlign: 'center',
      fontSize: getFontSize(params.vars.amountLength),
      lineHeight: getFontSize(params.vars.amountLength) * 1.1,
      fontWeight: '500',
      color: params.vars.hasAlert
        ? params.theme.colors.error.default
        : params.vars.disabled
          ? params.theme.colors.text.muted
          : params.theme.colors.text.default,
    },
    alertMessage: {
      textAlign: 'center',
      marginTop: 16,
      color: params.theme.colors.error.default,
    },
  });

export default styleSheet;
