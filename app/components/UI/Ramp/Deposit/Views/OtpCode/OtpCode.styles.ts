import { Theme } from '../../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    title: {
      marginTop: 24,
    },
    description: {
      marginTop: 8,
      color: theme.colors.text.muted,
    },
    codeFieldRoot: {
      marginTop: 8,
      gap: 5,
    },
    cellRoot: {
      width: 50,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background.muted,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      borderRadius: 8,
    },
    cellText: {
      color: theme.colors.text.default,
      fontSize: 24,
      lineHeight: 30,
      textAlign: 'center',
      fontWeight: 'bold',
    },
    focusCell: {
      borderColor: theme.colors.info.default,
    },
    resendButtonContainer: {
      flexDirection: 'row',
      marginTop: 12,
    },
    resendButtonText: {
      color: theme.colors.text.muted,
      marginRight: 4,
    },
    inlineLink: {
      color: theme.colors.text.muted,
      marginLeft: 4,
      textDecorationLine: 'underline',
    },
    footerContent: {
      gap: 8,
    },
  });
};

export default styleSheet;
