/* eslint-disable import/prefer-default-export */
import { Platform, StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    mainWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    wrapper: {
      flex: 1,
      flexDirection: 'column',
      gap: 16,
    },
    actionView: {
      flex: 1,
    },
    loader: {
      backgroundColor: colors.background.default,
      flex: 1,
      minHeight: 300,
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoWrapper: {
      justifyContent: 'flex-start',
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
    seedPhraseWrapper: {
      backgroundColor: colors.background.default,
      borderRadius: 8,
      flexDirection: 'row',
      borderColor: colors.border.default,
      borderWidth: 1,
      minHeight: 230,
    },
    seedPhraseContainer: {
      padding: 16,
      backgroundColor: colors.background.muted,
      borderRadius: 10,
      minHeight: 232,
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
      backgroundColor: colors.background.default,
      flex: 1,
      margin: 4,
      columnGap: 6,
    },
    confirmPasswordWrapper: {
      flex: 1,
    },
    passwordRequiredContent: {
      marginBottom: 20,
    },
    content: {
      alignItems: 'flex-start',
    },
    text: {
      marginBottom: 8,
      justifyContent: 'center',
    },
    buttonWrapper: {
      flex: 1,
      marginTop: 0,
      justifyContent: 'flex-end',
    },
    warningMessageText: {
      color: colors.error.default,
      ...fontStyles.normal,
    },
    keyboardAvoidingView: {
      flex: 1,
      flexDirection: 'row',
      alignSelf: 'center',
      marginBottom: 30,
    },
    field: {
      position: 'relative',
      flexDirection: 'column',
      gap: 2,
      width: '100%',
    },
    headerLeft: {
      marginLeft: 16,
    },
    buttonContainer: {
      paddingHorizontal: 0,
      marginBottom: Platform.OS === 'android' ? 16 : 0,
    },
  });
