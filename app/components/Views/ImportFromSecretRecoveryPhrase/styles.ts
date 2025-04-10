import { StyleSheet } from 'react-native';
import { scale } from 'react-native-size-matters';
import { fontStyles, colors as importedColors } from '../../../styles/common';
import Device from '../../../util/device';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    mainWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      marginVertical: 16,
    },
    wrapper: {
      flex: 1,
      paddingHorizontal: 32,
    },
    step: {
      fontSize: 14,
      color: importedColors.textAlternative,
      ...fontStyles.normal,
      marginTop: 16,
      marginBottom: 6,
    },
    title: {
      fontSize: Device.isAndroid() ? 28 : 32,
      color: colors.text.default,
      justifyContent: 'flex-start',
      textAlign: 'left',
      ...fontStyles.bold,
    },
    seedPhraseRootContainer: {
      marginTop: 6,
    },
    seedPhraseLabel: {
      fontSize: 14,
      color: importedColors.textAlternative,
      ...fontStyles.normal,
    },
    seedPhraseContainerText: {
      fontSize: 14,
      color: importedColors.textAlternative,
      ...fontStyles.normal,
    },
    seedPhraseContainer: {
      paddingTop: 16,
      backgroundColor: colors.background.muted,
      borderRadius: 10,
      marginTop: 16,
      marginBottom: 24,
      minHeight: 264,
    },
    seedPhraseInnerContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    seedPhraseContainerCta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 'auto',
      borderTopWidth: 1,
      borderTopColor: colors.background.default,
      paddingHorizontal: 16,
    },
    seedPhraseDefaultInput: {
      fontSize: 14,
      color: importedColors.textAlternative,
      borderWidth: 0,
      outlineWidth: 0,
      ...fontStyles.normal,
      backgroundColor: colors.background.muted,
      paddingHorizontal: 0,
      height: 44,
    },
    seedPhraseInputContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap', // Allows wrapping to new lines
      justifyContent: 'center',
      width: '100%',
      margin: 4,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 40,
      borderWidth: 1,
      borderColor: colors.border.muted,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 4,
      backgroundColor: colors.background.default,
      margin: 2,
      columnGap: 8,
    },
    inputNumber: {
      color: colors.text.muted,
      fontSize: 14,
      ...fontStyles.medium,
    },
    seedPhraseInput: {
      margin: 3,
    },
    clearButton: {
      width: '100%',
      borderWidth: 0,
      color: colors.text.muted,
      padding: 0,
      paddingVertical: 0,
      paddingHorizontal: 0,
    },
    pasteButton: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    seedPhraseInputFocused: {
      borderColor: colors.primary.default,
      borderWidth: 1,
    },
    seedPhraseContinueCta: {
      marginTop: 'auto',
      marginBottom: 16,
      width: '100%',
    },
    continueButton: {
      width: '100%',
    },
    field: {
      position: 'relative',
      flexDirection: 'column',
      gap: 8,
    },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    fieldCol: {
      width: '70%',
    },
    fieldColRight: {
      flexDirection: 'row-reverse',
      width: '30%',
    },
    label: {
      color: colors.text.default,
      fontSize: 14,
      ...fontStyles.medium,
      fontWeight: '500',
    },
    ctaWrapper: {
      marginTop: 20,
    },
    errorMsg: {
      color: colors.error.default,
      textAlign: 'center',
      ...fontStyles.normal,
    },
    seedPhrase: {
      marginBottom: 10,
      paddingTop: 20,
      paddingBottom: 20,
      paddingHorizontal: 20,
      fontSize: 20,
      borderRadius: 10,
      minHeight: 110,
      height: 'auto',
      borderWidth: 1,
      borderColor: colors.border.default,
      backgroundColor: colors.background.default,
      ...fontStyles.normal,
      color: colors.text.default,
    },
    padding: {
      paddingRight: 46,
    },
    biometrics: {
      alignItems: 'flex-start',
      marginTop: 10,
    },
    biometryLabel: {
      flex: 1,
      fontSize: 16,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    biometrySwitch: {
      marginTop: 10,
      flex: 0,
    },
    termsAndConditions: {
      paddingVertical: 10,
    },
    passwordStrengthLabel: {
      height: 20,
      fontSize: scale(10),
      color: colors.text.default,
      ...fontStyles.normal,
    },
    // eslint-disable-next-line react-native/no-unused-styles
    strength_weak: {
      color: colors.error.default,
    },
    // eslint-disable-next-line react-native/no-unused-styles
    strength_good: {
      color: colors.primary.default,
    },
    // eslint-disable-next-line react-native/no-unused-styles
    strength_strong: {
      color: colors.success.default,
    },
    showMatchingPasswords: {
      position: 'absolute',
      top: 52,
      right: 17,
      alignSelf: 'flex-end',
    },
    qrCode: {
      marginRight: 10,
      borderWidth: 1,
      borderRadius: 6,
      borderColor: colors.text.muted,
      paddingVertical: 4,
      paddingHorizontal: 6,
      marginTop: -50,
      marginBottom: 30,
      alignSelf: 'flex-end',
    },
    inputFocused: {
      borderColor: colors.primary.default,
      borderWidth: 2,
    },
    input: {
      ...fontStyles.normal,
      fontSize: 16,
      color: colors.text.default,
    },
    passwordContainer: {
      flexDirection: 'column',
      gap: 16,
    },
    passwordInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 8,
      height: 48,
    },
    passwordInputContainerFocused: {
      borderColor: colors.primary.default,
      borderWidth: 2,
    },
    passwordInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text.default,
      fontWeight: '500',
    },
    learnMoreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 8,
    },
    learnMoreCheckbox: {
      backgroundColor: importedColors.primaryDefault,
    },
    learnMoreText: {
      color: colors.text.default,
      fontSize: 12,
      ...fontStyles.normal,
    },
    learnMoreTextLink: {
      color: importedColors.primaryDefault,
      fontSize: 12,
      ...fontStyles.normal,
    },
    learnMoreTextContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 1,
    },
  });

export default createStyles;
