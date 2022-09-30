import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../styles/common';

const createStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    imputWrapper: {
      flex: 0,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
      paddingHorizontal: 8,
    },
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    myAccountsText: {
      ...fontStyles.normal,
      color: colors.primary.default,
      fontSize: 16,
      alignSelf: 'center',
    },
    myAccountsTouchable: {
      padding: 28,
    },
    addToAddressBookRoot: {
      flex: 1,
      padding: 24,
    },
    addToAddressBookWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    addTextTitle: {
      ...fontStyles.normal,
      fontSize: 24,
      color: colors.text.default,
      marginBottom: 24,
    },
    addTextSubtitle: {
      ...fontStyles.normal,
      fontSize: 16,
      color: colors.text.alternative,
      marginBottom: 24,
    },
    addTextInput: {
      ...fontStyles.normal,
      color: colors.text.default,
      fontSize: 20,
    },
    addInputWrapper: {
      flexDirection: 'row',
      borderWidth: 1,
      borderRadius: 8,
      borderColor: colors.border.default,
      height: 50,
      width: '100%',
    },
    input: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 6,
      width: '100%',
    },
    nextActionWrapper: {
      flex: 1,
      marginBottom: 16,
    },
    buttonNextWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    buttonNext: {
      flex: 1,
      marginHorizontal: 24,
    },
    addressErrorWrapper: {
      margin: 16,
    },
    footerContainer: {
      justifyContent: 'flex-end',
      marginBottom: 16,
    },
    warningContainer: {
      marginTop: 20,
      marginHorizontal: 24,
      marginBottom: 32,
    },
    buyEth: {
      color: colors.primary.default,
      textDecorationLine: 'underline',
    },
    confusabeError: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      margin: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.error.default,
      backgroundColor: colors.error.muted,
      borderRadius: 8,
    },
    confusabeWarning: {
      borderColor: colors.warning.default,
      backgroundColor: colors.warning.muted,
    },
    confusableTitle: {
      marginTop: -3,
      color: colors.text.default,
      ...fontStyles.bold,
      fontSize: 14,
    },
    confusableMsg: {
      color: colors.text.default,
      fontSize: 12,
      lineHeight: 16,
      paddingRight: 10,
    },
    warningIcon: {
      marginRight: 8,
    },
  });

export default createStyles;
