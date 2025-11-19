import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';
import { lightTheme } from '@metamask/design-tokens';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      borderTopColor: params.theme.colors.border.muted,
      borderTopWidth: 2,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 12,
      padding: 12,
    },

    top: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },

    bottom: {
      textAlign: 'center',
    },

    button: {
      width: '100%',
      height: 48,
      backgroundColor: lightTheme.colors.primary.default,
    },
  });

export default styleSheet;
