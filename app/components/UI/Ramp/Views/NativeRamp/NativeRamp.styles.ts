import { Theme } from '../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    networkName: {
      textAlign: 'center',
      marginBottom: 16,
    },
    selectors: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    centered: {
      textAlign: 'center',
    },
    cta: {
      marginTop: 30,
    },
    progressBarContainer: {
      alignItems: 'center',
      marginBottom: 20,
    },
    emailInputContainer: {
      marginTop: 16,
    },
    emailInput: {
      width: '100%',
      borderWidth: 1,
      borderColor: _params.theme.colors.border.default,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: _params.theme.colors.text.default,
    },
    inputContainerWrapper: {
      marginVertical: 16,
      alignItems: 'center',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    textInput: {
      fontSize: 44,
      textAlign: 'center',
      color: _params.theme.colors.text.default,
    },
    amountInput: {
      fontSize: 44,
      textAlign: 'center',
      color: _params.theme.colors.text.default,
    },
    currencyText: {
      color: _params.theme.colors.text.muted,
      fontSize: 44,
      marginLeft: 12,
      paddingTop: 32,
    },
    explainerContainer: {
      marginTop: 16,
      marginBottom: 24,
    },
    explainerTextContainer: {
      marginBottom: 24,
    },
    explainerImageContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    explainerImage: {
      width: 200,
      height: 200,
    },
    kycFieldContainer: {
      marginTop: 16,
    },
    kycInput: {
      width: '100%',
      borderWidth: 1,
      borderColor: _params.theme.colors.border.default,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      marginTop: 8,
    },
    kycFormScroll: {
      maxHeight: 400,
      width: '100%',
    },
    kycFormTitle: {
      marginBottom: 16,
      textAlign: 'center',
    },
    purposeButton: {
      marginBottom: 12,
    },
    kycUrlContainer: {
      alignItems: 'center',
      padding: 16,
    },
    kycUrlButton: {
      marginTop: 16,
    },
    kycLoading: {
      alignItems: 'center',
      padding: 24,
    },
    formFieldContainer: {
      marginVertical: 8,
    },
    formInput: {
      borderWidth: 1,
      borderColor: _params.theme.colors.border.default,
      borderRadius: 8,
      padding: 12,
      marginTop: 4,
      width: '100%',
      color: _params.theme.colors.text.default,
    },
    successIconContainer: {
      alignItems: 'center',
      marginVertical: 24,
    },
    successIcon: {
      width: 120,
      height: 120,
    },
    successTextContainer: {
      marginBottom: 16,
    },
    confirmationAmountContainer: {
      alignItems: 'center',
      marginVertical: 24,
    },
    currencyLogo: {
      width: 40,
      height: 40,
      marginBottom: 12,
    },
    confirmationAmount: {
      fontSize: 32,
      marginBottom: 4,
    },
    fiatAmount: {
      color: _params.theme.colors.text.muted,
    },
    confirmationDetails: {
      backgroundColor: _params.theme.colors.background.default,
      borderRadius: 10,
      marginTop: 16,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: _params.theme.colors.border.muted,
    },
    detailRowEnd: {
      alignItems: 'flex-end',
    },
    accountDetail: {
      color: _params.theme.colors.text.muted,
      marginTop: 4,
    },
    totalRow: {
      borderBottomWidth: 0,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    loadingText: {
      marginTop: 16,
      textAlign: 'center',
    },
    successContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    successAmountContainer: {
      alignItems: 'center',
      marginVertical: 24,
    },
    successAmount: {
      fontSize: 32,
      marginBottom: 4,
    },
    successMessageContainer: {
      marginBottom: 24,
    },
    successDetails: {
      backgroundColor: _params.theme.colors.background.default,
      borderRadius: 10,
      marginTop: 16,
    },
    etherscanLink: {
      marginTop: 16,
      alignItems: 'center',
    },
    linkText: {
      color: _params.theme.colors.primary.default,
    },
    multilineText: {
      flex: 1,
      textAlign: 'right',
      flexWrap: 'wrap',
    },
    bankDetails: {
      marginTop: 24,
    },
    bankDetailsTitle: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: _params.theme.colors.border.muted,
    },
    bankAddress: {
      flex: 1,
      textAlign: 'right',
      flexWrap: 'wrap',
    },
    bankTransferNote: {
      marginBottom: 24,
    },
    webview: {
      flex: 1,
      height: 400,
      marginVertical: 16,
    },
    scrollContentContainer: {
      flexGrow: 1,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    devButtonContainer: {
      marginTop: 16,
      alignItems: 'center',
    },
    devButtonText: {
      color: _params.theme.colors.primary.default,
      textDecorationLine: 'underline',
      fontSize: 14,
    },
  });

export default styleSheet;
