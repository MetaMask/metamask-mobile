/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';
import { fontStyles, colors as importedColors } from '../../../styles/common';

export const createStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    normalText: {
      color: colors.text.default,
      ...fontStyles.normal,
    },
    seedPhrase: {
      backgroundColor: colors.background.default,
      marginTop: 10,
      paddingBottom: 20,
      paddingLeft: 20,
      paddingRight: 20,
      fontSize: 20,
      textAlign: 'center',
      color: colors.text.default,
      ...fontStyles.normal,
    },
    seedPhraseView: {
      marginTop: 10,
      alignItems: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    clipboardButton: {
      alignSelf: 'center',
      width: '90%',
      marginVertical: 5,
    },
    rowWrapper: {
      padding: 20,
    },
    warningWrapper: {
      backgroundColor: colors.error.muted,
      margin: 20,
      marginTop: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.error.default,
    },
    warningRowWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignContent: 'center',
      alignItems: 'center',
    },
    warningText: {
      marginTop: 10,
      color: colors.error.default,
      ...fontStyles.normal,
    },
    input: {
      borderWidth: 2,
      borderRadius: 5,
      borderColor: colors.border.default,
      padding: 10,
      color: colors.text.default,
    },
    icon: {
      margin: 10,
      color: colors.error.default,
    },
    blueText: {
      color: colors.primary.default,
    },
    link: {
      top: 2.5,
    },
    warningMessageText: {
      marginLeft: 10,
      marginRight: 40,
      ...fontStyles.normal,
      color: colors.text.default,
    },
    enterPassword: {
      marginBottom: 15,
      color: colors.text.default,
    },
    boldText: {
      color: colors.text.default,
      ...fontStyles.bold,
    },
    tabContent: {
      padding: 20,
    },
    qrCodeContainer: {
      padding: 8,
      backgroundColor: colors.background.default,
    },
    qrCodeWrapper: {
      marginTop: 20,
      alignSelf: 'center',
      justifyContent: 'center',
      padding: 8,
      backgroundColor: importedColors.white,
    },
    tabUnderlineStyle: {
      height: 2,
      backgroundColor: colors.primary.default,
    },
    tabStyle: {
      paddingBottom: 0,
      backgroundColor: colors.background.default,
    },
    textStyle: {
      fontSize: 12,
      letterSpacing: 0.5,
      ...fontStyles.bold,
    },
    revealModalText: {
      marginBottom: 20,
    },
    tabBar: {
      borderColor: colors.border.muted,
    },
  });
