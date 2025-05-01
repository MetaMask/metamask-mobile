/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { Theme } from '../../../util/theme/models';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: theme.colors.background.default,
      flex: 1,
    },
    normalText: {
      color: theme.colors.text.default,
      ...fontStyles.normal,
    },
    seedPhrase: {
      backgroundColor: theme.colors.background.default,
      marginTop: 10,
      paddingBottom: 20,
      paddingLeft: 20,
      paddingRight: 20,
      fontSize: 20,
      textAlign: 'center',
      color: theme.colors.text.default,
      ...fontStyles.normal,
    },
    seedPhraseView: {
      marginTop: 10,
      alignItems: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
    },
    clipboardButton: {
      alignSelf: 'center',
      width: '90%',
      marginVertical: 5,
    },
    revealButton: {
      alignSelf: 'center',
      width: '100%',
      marginVertical: 5,
    },
    rowWrapper: {
      padding: 20,
    },
    warningWrapper: {
      backgroundColor: theme.colors.error.muted,
      margin: 20,
      marginTop: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.error.default,
    },
    warningRowWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignContent: 'center',
      alignItems: 'center',
    },
    warningText: {
      marginTop: 10,
      color: theme.colors.error.default,
      ...fontStyles.normal,
    },
    input: {
      borderWidth: 2,
      borderRadius: 5,
      borderColor: theme.colors.border.default,
      padding: 10,
      color: theme.colors.text.default,
    },
    icon: {
      margin: 10,
      color: theme.colors.error.default,
    },
    blueText: {
      color: theme.colors.primary.default,
    },
    link: {
      top: 2.5,
    },
    warningMessageText: {
      marginLeft: 10,
      marginRight: 40,
      ...fontStyles.normal,
      color: theme.colors.text.default,
    },
    enterPassword: {
      marginBottom: 15,
      color: theme.colors.text.default,
    },
    boldText: {
      color: theme.colors.text.default,
      ...fontStyles.bold,
    },
    tabContent: {
      padding: 20,
    },
    qrCodeContainer: {
      padding: 8,
      backgroundColor: theme.colors.background.default,
    },
    qrCodeWrapper: {
      marginTop: 20,
      alignSelf: 'center',
      justifyContent: 'center',
      padding: 8,
      backgroundColor: theme.brandColors.white,
    },
    tabUnderlineStyle: {
      height: 2,
      backgroundColor: theme.colors.primary.default,
    },
    tabStyle: {
      paddingBottom: 0,
      backgroundColor: theme.colors.background.default,
    },
    textStyle: {
      fontSize: 12,
      letterSpacing: 0.5,
      fontFamily: fontStyles.bold.fontFamily,
      fontWeight: fontStyles.bold.fontWeight,
    },
    revealModalText: {
      marginBottom: 20,
    },
    tabBar: {
      borderColor: theme.colors.border.muted,
    },
    stretch: {
      flex: 1,
    },
  });
