/* eslint-disable import/prefer-default-export */
import { Platform, StyleSheet } from 'react-native';
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
      marginBottom: 16, // ensure the copy to clipboard is not clipped
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
      paddingBottom: 0,
    },
    tabContentContainer: {
      minHeight: Platform.OS === 'android' ? 320 : 0,
      flexGrow: 1,
      flexShrink: 0,
      marginBottom: Platform.OS === 'android' ? 20 : 0,
    },
    warningWrapper: {
      backgroundColor: theme.colors.error.muted,
      padding: 20,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.error.default,
      marginTop: 16,
      paddingBottom: 20,
    },
    warningRowWrapper: {
      flexDirection: 'row',
      flexShrink: 1,
      alignItems: 'flex-start',
      width: '100%',
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
      color: theme.colors.error.default,
      position: 'relative',
      marginTop: 3,
    },
    blueText: {
      color: theme.colors.primary.default,
    },
    link: {
      top: 2.5,
    },
    warningMessageText: {
      marginLeft: 20,
      marginRight: 40,
      ...fontStyles.normal,
      color: theme.colors.text.default,
    },
    enterPassword: {
      marginBottom: 4,
      color: theme.colors.text.default,
    },
    boldText: {
      color: theme.colors.text.default,
      ...fontStyles.bold,
    },
    tabContainer: {
      paddingHorizontal: 16,
    },
    qrCodeContainer: {
      padding: 8,
      backgroundColor: theme.colors.background.default,
    },
    qrCodeWrapper: {
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
    },
    revealModalText: {
      marginBottom: 24,
    },
    tabBar: {
      borderColor: theme.colors.border.muted,
    },
    stretch: {
      flex: 1,
    },
  });
