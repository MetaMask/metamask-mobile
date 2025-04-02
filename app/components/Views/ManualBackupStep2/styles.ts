import { StyleSheet } from 'react-native';
import { fontStyles, colors as importedColors } from '../../../styles/common';
import Device from '../../../util/device';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      paddingTop: 0,
    },
    step: {
      fontSize: 14,
      color: importedColors.textAlternative,
      ...fontStyles.normal,
      marginBottom: 6,
    },
    mainWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      marginTop: 16,
    },
    wrapper: {
      flex: 1,
      // paddingHorizontal: 32,
    },
    onBoardingWrapper: {
      paddingHorizontal: 20,
    },
    action: {
      fontSize: 32,
      marginBottom: 16,
      color: colors.text.default,
      justifyContent: 'flex-start',
      textAlign: 'left',
      ...fontStyles.bold,
    },
    infoWrapper: {
      marginBottom: 16,
      justifyContent: 'flex-start',
    },
    info: {
      fontSize: 16,
      color: colors.text.default,
      textAlign: 'left',
      ...fontStyles.normal,
      // paddingHorizontal: 6,
    },
    seedPhraseWrapper: {
      backgroundColor: importedColors.backgroundMuted,
      borderRadius: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderColor: colors.border.default,
      marginBottom: 24,
      width: '100%',
      padding: 16,
    },
    wordWrapperContainer: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
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
    },
    wordWrapper: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      backgroundColor: colors.background.default,
      borderColor: colors.border.default,
      borderWidth: 1,
      borderRadius: 34,
      borderStyle: 'dashed',
      marginLeft: 4,
    },
    seedPhraseInput: {
      color: colors.text.default,
      fontSize: 14,
      fontWeight: '500',
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
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
      height: 40,
      backgroundColor: colors.background.muted,
      marginBottom: 6,
      borderRadius: 8,
      textAlign: 'center',
      justifyContent: 'center',
      alignItems: 'center',
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
      backgroundColor: colors.background.default,
      borderWidth: 1,
      borderColor: importedColors.primaryDefault,
    },
    selectedWordText: {
      color: importedColors.primaryDefault,
    },
    currentWord: {
      borderWidth: 1,
      borderColor: importedColors.primaryDefault,
    },
    confirmedWord: {
      borderWidth: 1,
      borderColor: importedColors.primaryDefault,
      borderStyle: 'solid',
    },
    wordBoxIndex: {
      color: colors.text.default,
    },
    seedPhraseContainer: {
      backgroundColor: colors.background.muted,
      borderRadius: 10,
      height: 'auto',
      flex: 1,
      flexDirection: 'column',
      marginBottom: 16,
      padding: 16,
    },
    seedPhraseInnerContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap', // Allows wrapping to new lines
      justifyContent: 'center',
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
      margin: 5,
      columnGap: 8,
    },
  });

export default createStyles;
