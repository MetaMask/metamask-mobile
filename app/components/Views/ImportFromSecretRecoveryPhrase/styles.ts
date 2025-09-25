import { StyleSheet, Platform } from 'react-native';
import { scale } from 'react-native-size-matters';
import { fontStyles, colors as importedColors } from '../../../styles/common';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    wrapper: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    importSrpContainer: {
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
      backgroundColor: colors.background.section,
      borderRadius: 10,
      marginTop: 16,
      minHeight: 264,
      maxHeight: 'auto',
    },
    seedPhraseInnerContainer: {
      paddingHorizontal: Platform.select({
        ios: 16,
        macos: 16,
        default: 14,
      }),
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
      borderWidth: 0,
      paddingHorizontal: 0,
      display: 'flex',
      flex: 1,
      backgroundColor: importedColors.transparent,
    },
    textAreaInput: {
      display: 'flex',
      backgroundColor: importedColors.transparent,
      fontSize: 16,
      color: colors.text.alternative,
      ...fontStyles.normal,
      height: 66,
    },
    seedPhraseInputContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
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
      paddingVertical: Platform.select({
        ios: 4,
        macos: 4,
        default: 0,
      }),
      borderRadius: 8,
      backgroundColor: colors.background.default,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      height: 40,
      fontSize: 16,
      color: colors.text.default,
      ...fontStyles.normal,
      textAlignVertical: 'center',
      paddingLeft: 8,
      overflow: 'hidden', // Ensure content doesn't overflow
    },
    seedPhraseInputItem: {
      width: '31.33%', // 100% / 3 = 33.33%, minus some space
      marginRight: '3%', // Space between columns
      marginBottom: 8,
      flex: 0, // Prevent flex growth
      minWidth: 0, // Allow flex shrinking below content size
    },
    seedPhraseInputItemLast: {
      marginRight: 0, // Remove right margin for last item in row
    },
    inputItem: {
      flex: 1,
      minWidth: 0, // Allow flex shrinking below content size
      maxWidth: '100%', // Ensure text doesn't overflow container
      paddingRight: 8, // Add some padding to prevent text from touching edges
    },
    passwordContainer: {
      flexDirection: 'column',
      rowGap: 16,
      flexGrow: 1,
    },
    passwordContainerTitle: {
      flexDirection: 'column',
      rowGap: 4,
    },
    learnMoreContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      gap: 8,
      marginTop: 8,
      marginBottom: 16,
      backgroundColor: colors.background.section,
      borderRadius: 8,
      padding: 16,
    },
    learnMoreTextContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      gap: 1,
      flexWrap: 'wrap',
      width: '90%',
      marginTop: -6,
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
    checkbox: {
      alignItems: 'flex-start',
    },
    inputPadding: {
      padding: Platform.OS === 'ios' ? 4 : 3,
      height: 40,
    },
    createPasswordCtaContainer: {
      width: '100%',
      flexDirection: 'column',
      rowGap: 18,
      marginTop: 'auto',
      marginBottom: Platform.select({
        ios: 16,
        android: 24,
        default: 16,
      }),
    },
  });

export default createStyles;
