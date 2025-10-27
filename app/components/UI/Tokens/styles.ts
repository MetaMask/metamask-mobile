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
    notch: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border.muted,
      alignSelf: 'center',
      marginTop: 4,
    },
    editNetworkButton: {
      width: '100%',
    },

    // Empty State Styles
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

    // Token List Item Styles
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

    // Portfolio Balance Styles
    portfolioBalance: {
      marginHorizontal: 16,
    },
    balanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    loaderWrapper: {
      paddingLeft: 40,
    },

    // Control Bar Styles
    controlIconButton: {
      backgroundColor: colors.background.default,
    },

    // Network Image Styles
    networkImageContainer: {
      position: 'absolute',
      right: 0,
    },
  });

export default createStyles;
