/* eslint-disable import/prefer-default-export */
import { StyleSheet, Platform } from 'react-native';
import { fontStyles, colors as importedColors } from '../../../styles/common';
import Device from '../../../util/device';
import { Colors } from '../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    mainWrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    wrapper: {
      flexGrow: 1,
      paddingHorizontal: 16,
    },
    headerButton: {
      paddingHorizontal: 16,
    },
    title: {
      marginTop: 0,
      marginBottom: 0,
    },
    contentContainer: {
      marginTop: 6,
    },
    subtitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 16,
    },
    textareaContainer: {
      width: '100%',
      marginBottom: 0,
    },
    textarea: {
      minHeight: 180,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border.muted,
      borderRadius: 8,
      fontSize: 16,
      lineHeight: 24,
      color: colors.text.default,
      backgroundColor: colors.background.default,
      ...fontStyles.normal,
    },
    textareaError: {
      borderColor: colors.error.default,
    },
    pasteText: {
      textAlign: 'right',
      paddingTop: 12,
      paddingBottom: 16,
      alignSelf: 'flex-end',
    },
    errorBanner: {
      marginTop: 16,
    },
    footerText: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 4,
    },
    dataRow: {
      marginBottom: 10,
    },
    label: {
      fontSize: 14,
      color: colors.text.default,
      textAlign: 'left',
      ...fontStyles.normal,
    },
    subtitleText: {
      fontSize: 18,
      ...fontStyles.bold,
      color: colors.text.default,
    },
    icon: {
      textAlign: 'left',
      fontSize: 50,
      marginTop: 0,
      marginLeft: 0,
      color: colors.icon.alternative,
    },
    buttonWrapper: {
      width: '100%',
      marginTop: 24,
    },
    button: {
      marginBottom: Device.isIphoneX() ? 20 : 0,
    },
    top: {
      paddingTop: 0,
      padding: 30,
    },
    bottom: {
      width: '100%',
      padding: 30,
      backgroundColor: colors.background.default,
    },
    navbarLeftButton: {
      alignSelf: 'flex-start',
      paddingTop: 20,
      paddingBottom: 10,
      marginTop: Device.isIphoneX() ? 40 : 20,
    },
    navbarRightButton: {
      alignSelf: 'flex-end',
      paddingTop: 20,
      paddingBottom: 10,
      marginTop: Device.isIphoneX() ? 40 : 20,
    },
    closeIcon: {
      fontSize: 28,
      color: colors.text.default,
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
      overflow: 'hidden',
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
    inputItem: {
      flex: 1,
      minWidth: 0,
      maxWidth: '100%',
      paddingRight: 8,
    },
    inputIndex: {
      marginRight: -4,
    },
  });

export { createStyles };
