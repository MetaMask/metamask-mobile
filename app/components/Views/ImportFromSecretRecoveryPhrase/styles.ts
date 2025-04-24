import { StyleSheet, Platform } from 'react-native';
import { scale } from 'react-native-size-matters';
import { fontStyles } from '../../../styles/common';
// import Device from '../../../util/device';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    wrapper: {
      flex: 1,
      paddingHorizontal: 16,
    },
    container: {
      marginTop: 6,
    },
    description: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    seedPhraseRoot: {
      flexDirection: 'column',
      gap: 4,
      marginBottom: 24,
    },
    seedPhraseContainer: {
      paddingTop: 16,
      backgroundColor: colors.background.muted,
      borderRadius: 10,
      marginTop: 16,
      minHeight: 264,
    },
    seedPhraseInnerContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    seedPhraseDefaultInputPlaceholder: {
      fontSize: 14,
      ...fontStyles.normal,
    },
    seedPhraseContainerCta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 'auto',
      borderTopWidth: 1,
      borderTopColor: colors.background.default,
    },
    seedPhraseDefaultInput: {
      fontSize: 14,
      color: colors.text.alternative,
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
      flex: 1,
      textAlign: 'center',
    },
    seedPhraseInputFocused: {
      borderColor: colors.primary.default,
      borderWidth: 1,
    },
    seedPhraseCtaContainer: {
      width: '100%',
      flexDirection: 'column',
      gap: 16,
    },
    field: {
      position: 'relative',
      flexDirection: 'column',
      gap: 8,
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
    input: {
      paddingVertical: Platform.OS === 'ios' ? 4 : 0,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: colors.background.default,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      height: 40,
      fontSize: 14,
      color: colors.text.default,
      ...fontStyles.normal,
      width: '100%',
    },
    passwordContainer: {
      flexDirection: 'column',
      gap: 16,
    },
    learnMoreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 8,
    },
    learnMoreTextContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 1,
    },
    headerLeft: {
      marginLeft: 16,
    },
    headerRight: {
      marginRight: 16,
    },
    inputIndex: {
      marginRight: -4,
    },
    label: {
      marginBottom: -4,
    },
  });

export default createStyles;
