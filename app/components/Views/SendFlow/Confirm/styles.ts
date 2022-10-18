import { fontStyles } from '../../../../styles/common';
import { StyleSheet } from 'react-native';

const createStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    inputWrapper: {
      flex: 0,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
      paddingHorizontal: 8,
    },
    amountWrapper: {
      flexDirection: 'column',
      margin: 24,
    },
    textAmountLabel: {
      ...fontStyles.normal,
      fontSize: 14,
      textAlign: 'center',
      color: colors.text.alternative,
      textTransform: 'uppercase',
      marginVertical: 3,
    },
    textAmount: {
      ...fontStyles.light,
      color: colors.text.default,
      fontSize: 44,
      textAlign: 'center',
    },
    buttonNext: {
      flex: 1,
      marginHorizontal: 24,
      alignSelf: 'flex-end',
    },
    buttonNextWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginBottom: 16,
    },
    actionTouchable: {
      padding: 12,
    },
    actionText: {
      ...fontStyles.normal,
      color: colors.primary.default,
      fontSize: 14,
      alignSelf: 'center',
    },
    actionsWrapper: {
      margin: 24,
    },
    CollectibleMediaWrapper: {
      flexDirection: 'column',
      alignItems: 'center',
      margin: 16,
    },
    collectibleName: {
      ...fontStyles.normal,
      fontSize: 18,
      color: colors.text.default,
      textAlign: 'center',
    },
    collectibleTokenId: {
      ...fontStyles.normal,
      fontSize: 12,
      color: colors.text.alternative,
      marginTop: 8,
      textAlign: 'center',
    },
    CollectibleMedia: {
      height: 120,
      width: 120,
    },
    qrCode: {
      marginBottom: 16,
      paddingHorizontal: 36,
      paddingBottom: 24,
      paddingTop: 16,
      backgroundColor: colors.background.default,
      borderRadius: 8,
      width: '100%',
    },
    hexDataWrapper: {
      padding: 10,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: colors.background.default,
    },
    addressTitle: {
      ...fontStyles.bold,
      color: colors.text.default,
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      fontSize: 16,
      marginBottom: 16,
    },
    hexDataClose: {
      zIndex: 999,
      position: 'absolute',
      top: 12,
      right: 20,
    },
    hexDataText: {
      textAlign: 'justify',
    },
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    keyboardAwareWrapper: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    errorWrapper: {
      marginHorizontal: 24,
      marginTop: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: colors.error.muted,
      borderColor: colors.error.default,
      borderRadius: 8,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    error: {
      color: colors.text.default,
      fontSize: 12,
      lineHeight: 16,
      ...fontStyles.normal,
      textAlign: 'center',
    },
    underline: {
      textDecorationLine: 'underline',
      ...fontStyles.bold,
    },
    text: {
      lineHeight: 20,
      color: colors.text.default,
    },
  });

export default createStyles;
