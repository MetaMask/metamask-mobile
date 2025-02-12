import { StyleSheet, TextStyle } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { Colors } from 'app/util/theme/models';
import { typography } from '@metamask/design-tokens';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    bottomSheetWrapper: {
      alignItems: 'flex-start',
    },
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
      fontFamily: 'EuclidCircularB-Medium',
    },
    text: {
      fontSize: 20,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    add: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addText: {
      fontSize: 14,
      color: colors.primary.default,
      ...fontStyles.normal,
    },
    tokensDetectedButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
    },
    tokensDetectedText: {
      fontSize: 14,
      color: colors.primary.default,
      ...fontStyles.normal,
    },
    footer: {
      flex: 1,
      paddingBottom: 30,
      alignItems: 'center',
      marginTop: 9,
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
    balanceFiatTokenError: {
      textTransform: 'capitalize',
    },
    ethLogo: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: 'hidden',
    },
    emptyText: {
      color: colors.text.alternative,
      marginBottom: 8,
      fontSize: 14,
    },
    skeleton: { width: 50 },
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
    assetName: {
      flexDirection: 'row',
    },
    stakeButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    portfolioBalance: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      justifyContent: 'space-between',
      paddingTop: 24,
    },
    portfolioLink: { marginLeft: 8 },
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
    boxContentHeader: {
      borderWidth: 0,
      color: colors.text.default,
      alignItems: 'center',
    },
    textMoadlHeader: {
      ...typography.lBodyMDBold,
      fontSize: 18,
    } as TextStyle,
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
    actionBarWrapper: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingLeft: 8,
      paddingRight: 8,
      paddingBottom: 16,
      paddingTop: 8,
    },
    controlButtonOuterWrapper: {
      flexDirection: 'row',
      width: '100%',
      justifyContent: 'space-between',
    },
    controlButtonInnerWrapper: {
      flexDirection: 'row',
    },
    controlButton: {
      backgroundColor: colors.background.default,
      borderColor: colors.border.default,
      borderStyle: 'solid',
      borderWidth: 1,
      marginLeft: 5,
      marginRight: 5,
      maxWidth: '60%',
    },
    controlButtonDisabled: {
      backgroundColor: colors.background.default,
      borderColor: colors.border.default,
      borderStyle: 'solid',
      borderWidth: 1,
      marginLeft: 5,
      marginRight: 5,
      maxWidth: '60%',
      opacity: 0.5,
    },
    controlButtonText: {
      color: colors.text.default,
    },
    controlIconButton: {
      backgroundColor: colors.background.default,
      borderColor: colors.border.default,
      borderStyle: 'solid',
      borderWidth: 1,
      marginLeft: 5,
      marginRight: 5,
      borderRadius: 50,
      width: 50,
      height: 40,
    },
    balanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    privacyIcon: {
      marginLeft: 8,
    },
    portfolioButtonContainer: {
      alignItems: 'center',
    },
  });

export default createStyles;
