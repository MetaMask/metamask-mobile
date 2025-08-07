import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme; vars: { hasAlert: boolean } }) =>
  StyleSheet.create({
    container: {
      display: 'flex',
      gap: 8,
      marginTop: 16,
      marginBottom: 16,
    },
    input: {
      textAlign: 'center',
      fontSize: 64,
      fontWeight: '500',
      color: params.vars.hasAlert
        ? params.theme.colors.error.default
        : params.theme.colors.text.default,
    },
    alert: {
      color: params.theme.colors.error.default,
      textAlign: 'center',
    },
  });

export default styleSheet;
