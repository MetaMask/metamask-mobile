import { Theme } from '@metamask/design-tokens';
import { StyleSheet, ViewStyle } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const {
    theme: { colors },
  } = params;

  const baseRowStyle = {
    display: 'flex',
    marginBottom: 2,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 16,
    paddingRight: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
    backgroundColor: colors.background.alternative,
  } as ViewStyle;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
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
      borderRadius: 8,
      padding: 16,
    },
    firstAccountBox: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      marginBottom: 2,
    },
    lastAccountBox: {
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
    },
    middleAccountBox: {
      marginBottom: 2,
      borderRadius: 0,
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
  });
};

export default styleSheet;
