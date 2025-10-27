import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { Colors } from 'app/util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    // Bottom Sheet Styles
    bottomSheetTitle: {
      alignSelf: 'center',
      paddingTop: 16,
      paddingBottom: 16,
    },
    bottomSheetText: {
      width: '100%',
    },
    emptyView: {
      backgroundColor: colors.background.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 50,
    },
    emptyTokensView: {
      alignItems: 'center',
      marginTop: 130,
    },
    emptyTokensViewText: {
      fontFamily: 'Geist Medium',
    },
    ethLogo: {
      width: 40,
      height: 40,
      borderRadius: 20,
      overflow: 'hidden',
    },
    badge: {
      marginTop: 8,
    },
    balances: {
      flex: 1,
      justifyContent: 'center',
      marginLeft: 20,
    },
    balanceFiat: {
      color: colors.text.alternative,
      ...fontStyles.normal,
      textTransform: 'uppercase',
    },
    buy: {
      alignItems: 'center',
      marginVertical: 5,
      marginHorizontal: 15,
    },
    buyTitle: {
      marginVertical: 5,
      textAlign: 'center',
    },
    buyButton: {
      marginVertical: 5,
    },
    assetName: {
      flexDirection: 'row',
      gap: 8,
    },
    percentageChange: {
      flexDirection: 'row',
      alignItems: 'center',
      alignContent: 'center',
    },
    stakeButton: {
      flexDirection: 'row',
    },
    dot: {
      marginLeft: 2,
      marginRight: 2,
    },
    portfolioBalance: {
      marginHorizontal: 16,
    },
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    box: {
      backgroundColor: colors.background.default,
      paddingHorizontal: 8,
      paddingBottom: 20,
      borderWidth: 0,
      padding: 0,
    },
    boxContent: {
      backgroundColor: colors.background.default,
      paddingBottom: 21,
      paddingTop: 0,
      borderWidth: 0,
    },
    editNetworkButton: {
      width: '100%',
    },
    notch: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border.muted,
      alignSelf: 'center',
      marginTop: 4,
    },
    balanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    loaderWrapper: {
      paddingLeft: 40,
    },
    controlIconButton: {
      backgroundColor: colors.background.default,
    },
    networkImageContainer: {
      position: 'absolute',
      right: 0,
    },
  });

export default createStyles;
