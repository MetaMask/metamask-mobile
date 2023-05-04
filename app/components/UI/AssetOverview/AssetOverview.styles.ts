import { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors, typography } = theme;
  return StyleSheet.create({
    wrapper: {
      paddingTop: 20,
    },
    warningWrapper: {
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    warning: {
      ...typography.sBodyMD,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.warning.default,
      backgroundColor: colors.warning.muted,
      padding: 20,
    } as TextStyle,
    warningLinks: {
      ...typography.sBodyMD,
      color: colors.primary.default,
    } as TextStyle,
    chartNavigationWrapper: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 10,
      paddingVertical: 20,
    },
    balanceWrapper: {
      paddingHorizontal: 16,
    },
    balanceButtons: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      paddingTop: 20,
    },
    receiveButton: {
      flexShrink: 1,
      marginRight: 8,
      width: '50%',
    },
    sendButton: {
      flexShrink: 1,
      marginLeft: 8,
      width: '50%',
    },
    aboutWrapper: {
      marginBottom: 20,
      paddingHorizontal: 16,
    },
  });
};

export default styleSheet;
