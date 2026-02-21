/* eslint-disable import/prefer-default-export */
import { Platform, StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { Colors, Theme } from '../../../util/theme/models';

export const createStyles = (theme: Theme, colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: theme.colors.background.default,
      flex: 1,
      paddingBottom: 16,
      height: '100%',
    },
    quizContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 32,
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    stepIndicatorContainer: {
      marginBottom: 8,
    },
    quizButtonContainer: {
      width: '100%',
    },
    quizAnsweredContainer: {
      flex: 1,
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      width: '100%',
    },
    quizDescription: {
      marginTop: 24,
    },
    quizQuestion: {
      width: '90%',
      marginBottom: 24,
    },
    quizQuestionContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 24,
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
      marginTop: 16,
      flex: 1,
      width: '100%',
      height: '100%',
      minHeight: 232,
    },
    clipboardButton: {
      alignSelf: 'center',
      width: '100%',
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
      fontSize: 14,
      marginTop: 24,
    },
    warningText: {
      marginTop: 10,
      color: theme.colors.error.default,
      ...fontStyles.normal,
    },
    enterPassword: {
      marginBottom: 4,
      color: theme.colors.text.default,
    },
    tabContainer: {
      paddingHorizontal: 16,
    },
    qrCodeWrapper: {
      alignSelf: 'center',
      justifyContent: 'center',
      marginTop: 16,
    },
    button: {
      width: '100%',
      textAlign: 'center',
    },
    seedPhraseConcealerContainer: {
      flex: 1,
      borderRadius: 8,
    },
    seedPhraseConcealer: {
      alignItems: 'center',
      borderRadius: 8,
      paddingHorizontal: 24,
      paddingVertical: 45,
      flexDirection: 'column',
      rowGap: 16,
      height: '100%',
      flex: 1,
      justifyContent: 'center',
    },
    blurContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      height: '100%',
      borderRadius: 8,
      flex: 1,
    },
    blurView: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      height: '100%',
      borderRadius: 8,
      flex: 1,
      opacity: 0.5,
    },
    seedPhraseContainer: {
      minHeight: 200,
      flex: 1,
      width: '100%',
      height: '100%',
    },
    seedPhraseListContainer: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    word: {
      flex: 1,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 40,
      borderWidth: 1,
      borderColor: colors.border.muted,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: colors.background.muted,
      flex: 1,
      margin: 4,
      columnGap: 6,
    },
  });
