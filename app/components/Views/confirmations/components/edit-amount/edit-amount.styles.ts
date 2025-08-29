import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

function getFontSize(length: number) {
  if (length <= 8) return 64;
  if (length <= 13) return 40;
  if (length <= 18) return 30;
  return 20;
}

const styleSheet = (params: {
  theme: Theme;
  vars: { amountLength: number; hasAlert: boolean };
}) =>
  StyleSheet.create({
    container: {
      display: 'flex',
      marginTop: 50,
      flex: 1,
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    primaryContainer: {
      display: 'flex',
      flexDirection: 'column',
    },
    inputContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 16,
      minHeight: 100,
    },
    input: {
      textAlign: 'center',
      fontSize: getFontSize(params.vars.amountLength),
      fontWeight: '500',
      color: params.vars.hasAlert
        ? params.theme.colors.error.default
        : params.theme.colors.text.default,
    },
  });

export default styleSheet;
