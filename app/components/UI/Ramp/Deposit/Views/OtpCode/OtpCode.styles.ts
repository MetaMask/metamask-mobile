import { Theme } from '../../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    codeFieldRoot: {
      marginTop: 40,
      marginLeft: 'auto',
      marginRight: 'auto',
    },
    cellRoot: {
      margin: 5,
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
      borderBottomWidth: 2,
    },
    resendButtonContainer: {
      flexDirection: 'row',
      marginTop: 12,
    },
    resendButtonText: {
      color: theme.colors.text.muted,
      marginRight: 4,
    },
    resendButton: {
      color: theme.colors.info.default,
      marginLeft: 4,
    },
    contactSupportButton: {
      color: theme.colors.info.default,
      marginLeft: 4,
    },
    footerContent: {
      gap: 8,
    },
  });
};

export default styleSheet;
