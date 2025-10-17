import { Theme } from '@metamask/design-tokens';
import { StyleSheet, ViewStyle } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const {
    theme: { colors },
  } = params;

  const baseRowStyle = {
    display: 'flex',
    marginBottom: 2,
    paddingTop: 16,
    paddingBottom: 16,
    paddingLeft: 16,
    paddingRight: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
    backgroundColor: colors.background.muted,
  } as ViewStyle;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background.default,
    },

    container: {
      flex: 1,
      padding: 16,
    },

    header: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      margin: 16,
    },

    avatar: {
      marginBottom: 32,
    },

    walletName: {
      ...baseRowStyle,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
    },
    balance: {
      ...baseRowStyle,
    },
    srpSection: {
      ...baseRowStyle,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
    },
    srpRevealSection: {
      ...baseRowStyle,
      borderRadius: 8,
      marginTop: 16,
    },
    srpRevealContent: {
      flex: 1,
    },
    accountsList: {
      marginTop: 16,
      flexShrink: 1,
    },
    listContainer: {
      flexGrow: 1,
      flexShrink: 1,
      flexDirection: 'row',
    },
    accountBox: {
      backgroundColor: colors.background.alternative,
      paddingTop: 14,
      paddingBottom: 14,
      paddingLeft: 16,
      paddingRight: 16,
    },
    accountGroupBox: {
      backgroundColor: colors.background.muted,
      paddingLeft: 16,
      paddingRight: 16,
    },
    firstAccountBox: {
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
    },
    lastAccountBox: {
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
    },
    text: {
      color: colors.text.alternative,
    },
    modalStyle: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    modalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      backgroundColor: colors.background.default,
    },
    addAccountItem: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 8,
    },
    addAccountButton: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    addAccountItemDisabled: {
      opacity: 0.5,
    },
    addAccountIconContainer: {
      backgroundColor: colors.background.muted,
      borderRadius: 8,
      padding: 8,
      marginRight: 16,
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addAccountText: {
      color: colors.text.alternative,
      flex: 1,
    },
    addAccountButtonText: {
      color: colors.primary.default,
      fontWeight: '500',
    },
  });
};

export default styleSheet;
