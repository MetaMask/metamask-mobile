import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { Colors } from 'app/util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
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
    ethLogo: {
      width: 40,
      height: 40,
      borderRadius: 20,
      overflow: 'hidden',
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
    centered: {
      textAlign: 'center',
    },
    stockBadge: {
      backgroundColor: colors.background.muted,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignSelf: 'flex-start',
      marginLeft: 4,
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
    controlIconButton: {
      backgroundColor: colors.background.default,
    },
    balanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    loaderWrapper: {
      flexDirection: 'column',
      gap: 4,
    },
    networkImageContainer: {
      position: 'absolute',
      right: 0,
    },
    badge: {
      marginTop: 8,
    },
  });

export default createStyles;
