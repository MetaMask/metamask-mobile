/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';

export const createStyles = (colors: any) =>
  StyleSheet.create({
    mainWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    wrapper: {
      flex: 1,
      paddingHorizontal: 32,
    },
    onBoardingWrapper: {
      paddingHorizontal: 20,
    },
    loader: {
      backgroundColor: colors.background.default,
      flex: 1,
      minHeight: 300,
      justifyContent: 'center',
      alignItems: 'center',
    },
    action: {
      fontSize: 18,
      marginVertical: 16,
      color: colors.text.default,
      justifyContent: 'center',
      textAlign: 'center',
      ...fontStyles.bold,
    },
    infoWrapper: {
      marginBottom: 16,
      justifyContent: 'center',
    },
    info: {
      fontSize: 14,
      color: colors.text.default,
      textAlign: 'center',
      ...fontStyles.normal,
      paddingHorizontal: 6,
    },
    seedPhraseConcealerContainer: {
      flex: 1,
      borderRadius: 8,
    },
    seedPhraseConcealer: {
      backgroundColor: colors.overlay.alternative,
      alignItems: 'center',
      borderRadius: 8,
      paddingHorizontal: 24,
      paddingVertical: 45,
    },
    blurView: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      borderRadius: 8,
    },
    icon: {
      width: 24,
      height: 24,
      color: colors.overlay.inverse,
      textAlign: 'center',
      marginBottom: 32,
    },
    reveal: {
      fontSize: Device.isMediumDevice() ? 13 : 16,
      ...fontStyles.bold,
      color: colors.overlay.inverse,
      lineHeight: 22,
      marginBottom: 8,
      textAlign: 'center',
    },
    watching: {
      fontSize: Device.isMediumDevice() ? 10 : 12,
      color: colors.overlay.inverse,
      lineHeight: 17,
      marginBottom: 32,
      textAlign: 'center',
    },
    viewButtonContainer: {
      width: 155,
      padding: 12,
    },
    seedPhraseWrapper: {
      backgroundColor: colors.background.default,
      borderRadius: 8,
      flexDirection: 'row',
      borderColor: colors.border.default,
      borderWidth: 1,
      marginBottom: 64,
      minHeight: 275,
    },
    wordColumn: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: Device.isMediumDevice() ? 18 : 24,
      paddingVertical: 18,
      justifyContent: 'space-between',
    },
    wordWrapper: {
      flexDirection: 'row',
    },
    word: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      fontSize: 14,
      color: colors.text.default,
      backgroundColor: colors.background.default,
      borderColor: colors.primary.default,
      borderWidth: 1,
      borderRadius: 13,
      textAlign: 'center',
      textAlignVertical: 'center',
      lineHeight: 14,
      flex: 1,
    },
    confirmPasswordWrapper: {
      flex: 1,
      padding: 30,
      paddingTop: 0,
    },
    passwordRequiredContent: {
      marginBottom: 20,
    },
    content: {
      alignItems: 'flex-start',
    },
    title: {
      fontSize: 32,
      marginTop: 20,
      marginBottom: 10,
      color: colors.text.default,
      justifyContent: 'center',
      textAlign: 'left',
      ...fontStyles.normal,
    },
    text: {
      marginBottom: 10,
      marginTop: 20,
      justifyContent: 'center',
    },
    label: {
      fontSize: 16,
      lineHeight: 23,
      color: colors.text.default,
      textAlign: 'left',
      ...fontStyles.normal,
    },
    buttonWrapper: {
      flex: 1,
      marginTop: 20,
      justifyContent: 'flex-end',
    },
    input: {
      borderWidth: 2,
      borderRadius: 5,
      width: '100%',
      borderColor: colors.border.default,
      padding: 10,
      height: 40,
      color: colors.text.default,
    },
    warningMessageText: {
      paddingVertical: 10,
      color: colors.error.default,
      ...fontStyles.normal,
    },
    keyboardAvoidingView: {
      flex: 1,
      flexDirection: 'row',
      alignSelf: 'center',
    },
  });
