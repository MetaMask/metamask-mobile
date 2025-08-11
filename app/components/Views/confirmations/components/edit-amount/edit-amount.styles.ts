import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme; vars: { hasAlert: boolean } }) =>
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
      gap: 16,
    },
    input: {
      textAlign: 'center',
      fontSize: 64,
      fontWeight: '500',
      color: params.vars.hasAlert
        ? params.theme.colors.error.default
        : params.theme.colors.text.default,
      marginBottom: -8,
    },
  });

export default styleSheet;
