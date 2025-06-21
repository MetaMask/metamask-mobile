import { StyleSheet } from 'react-native';
import { Colors } from 'app/util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      zIndex: 99999999999999,
    },
    title: {
      fontWeight: 'bold',
      textAlign: 'center',
      flex: 1,
    },
    balanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    privacyIcon: {
      marginLeft: 8,
    },
    tokenItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.muted,
    },
    tokenInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tokenDetails: {
      marginLeft: 12,
    },
    tokenSymbol: {
      fontWeight: 'bold',
    },
    tokenName: {
      color: colors.text.muted,
    },
    loaderWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonContainer: {
      marginTop: 24,
    },
  });

export default createStyles;
