import { StyleSheet, Platform, TextStyle } from 'react-native';
import { fontStyles, colors as commonColors } from '../../../styles/common';
import { Colors } from '../../../util/theme/models';

/**
 * Creates styles for the SrpInputGrid component
 * @param colors - Theme colors object
 * @returns StyleSheet object with all component styles
 */
export const createStyles = (colors: Colors) =>
  StyleSheet.create({
    seedPhraseRoot: {
      flexDirection: 'column' as const,
      gap: 4,
      marginTop: 8,
      marginBottom: 24,
    },
    seedPhraseContainer: {
      paddingTop: 16,
      backgroundColor: colors.background.section,
      borderRadius: 10,
      minHeight: 210,
      maxHeight: 'auto',
    },
    seedPhraseInnerContainer: {
      paddingHorizontal: Platform.select({
        ios: 16,
        macos: 16,
        default: 14,
      }),
    },
    seedPhraseInputContainer: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      width: '100%',
    },
    seedPhraseDefaultInput: {
      borderWidth: 0,
      paddingHorizontal: 0,
      display: 'flex' as const,
      flex: 1,
      backgroundColor: commonColors.transparent,
    },
    seedPhraseInputItem: {
      width: '31.33%',
      marginRight: '3%',
      marginBottom: 8,
      flex: 0,
      minWidth: 0,
    },
    seedPhraseInputItemLast: {
      marginRight: 0,
    },
    textAreaInput: {
      display: 'flex' as const,
      height: 66,
      color: colors.text.alternative,
      backgroundColor: commonColors.transparent,
      ...fontStyles.normal,
      fontSize: 16,
      lineHeight: 20,
      paddingTop: Platform.OS === 'ios' ? 12 : 8,
      paddingBottom: 12,
    } satisfies TextStyle,
    inputItem: {
      flex: 1,
      minWidth: 0,
      maxWidth: '100%',
      paddingRight: 8,
    } satisfies TextStyle,
    input: {
      paddingVertical: Platform.select({
        ios: 4,
        macos: 4,
        default: 0,
      }),
      borderRadius: 8,
      backgroundColor: colors.background.default,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'flex-start' as const,
      height: 40,
      fontSize: 16,
      color: colors.text.default,
      ...fontStyles.normal,
      textAlignVertical: 'center' as const,
      paddingLeft: 8,
      overflow: 'hidden' as const,
    } satisfies TextStyle,
    inputIndex: {
      marginRight: -4,
    },
    pasteText: {
      textAlign: 'right' as const,
      paddingTop: 8,
      paddingBottom: 1,
      alignSelf: 'flex-end' as const,
    } satisfies TextStyle,

    hiddenInput: {
      opacity: 0,
      position: 'absolute' as const,
      height: 0,
      top: 0,
      left: 0,
    } satisfies TextStyle,
  });
