import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';

const createStyles = (colors: any) =>
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
    action: {
      fontSize: 18,
      marginBottom: 16,
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
      fontSize: 16,
      color: colors.text.default,
      textAlign: 'center',
      ...fontStyles.normal,
      paddingHorizontal: 6,
    },
    seedPhraseWrapper: {
      backgroundColor: colors.background.default,
      borderRadius: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderColor: colors.border.default,
      borderWidth: 1,
      marginBottom: 24,
    },
    seedPhraseWrapperComplete: {
      borderColor: colors.success.default,
    },
    seedPhraseWrapperError: {
      borderColor: colors.error.default,
    },
    colLeft: {
      paddingTop: 18,
      paddingLeft: 27,
      paddingBottom: 4,
      alignItems: 'flex-start',
    },
    colRight: {
      paddingTop: 18,
      paddingRight: 27,
      paddingBottom: 4,
      alignItems: 'flex-end',
    },
    wordBoxWrapper: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    wordWrapper: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      width: Device.isMediumDevice() ? 75 : 95,
      backgroundColor: colors.background.default,
      borderColor: colors.border.default,
      borderWidth: 1,
      borderRadius: 34,
      borderStyle: 'dashed',
      marginLeft: 4,
    },
    word: {
      fontSize: 14,
      color: colors.text.default,
      lineHeight: 14,
      textAlign: 'center',
    },
    selectableWord: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      color: colors.text.default,
      width: 95,
      backgroundColor: colors.background.default,
      borderColor: colors.primary.default,
      borderWidth: 1,
      marginBottom: 6,
      borderRadius: 13,
      textAlign: 'center',
    },
    selectableWordText: {
      textAlign: 'center',
      fontSize: 14,
      lineHeight: 14,
      color: colors.text.default,
    },
    words: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: Device.isMediumDevice()
        ? 'space-around'
        : 'space-between',
    },
    successRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    successText: {
      fontSize: 12,
      color: colors.success.default,
      marginLeft: 4,
    },
    selectedWord: {
      backgroundColor: colors.icon.muted,
      borderWidth: 1,
      borderColor: colors.icon.muted,
    },
    selectedWordText: {
      color: colors.text.default,
    },
    currentWord: {
      borderWidth: 1,
      borderColor: colors.primary.default,
    },
    confirmedWord: {
      borderWidth: 1,
      borderColor: colors.primary.default,
      borderStyle: 'solid',
    },
    wordBoxIndex: {
      color: colors.text.default,
    },
  });

export default createStyles;
