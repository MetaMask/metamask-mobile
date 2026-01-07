import { typography } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';
import Device from '../../../../../util/device';
import {
  fontStyles,
  colors as staticColors,
} from '../../../../../styles/common';
import {
  getFontFamily,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

export const createStyles = (colors) =>
  StyleSheet.create({
    baseAll: {
      padding: 16,
    },
    container: {
      flex: 1,
    },
    scrollViewContent: {
      height: '100%',
    },
    scrollableBox: {
      marginTop: 24,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
    },
    addRpcNameButton: {
      paddingTop: 32,
      alignSelf: 'center',
    },
    sheet: {
      flexDirection: 'column',
      bottom: 0,
      top: Device.getDeviceHeight() * 0.5,
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      height: Device.getDeviceHeight() * 0.5,
    },
    sheetSmall: {
      position: 'absolute',
      bottom: 0,
      top: Device.getDeviceHeight() * 0.7,
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      height: Device.getDeviceHeight() * 0.3,
    },
    sheetRpcForm: {
      position: 'absolute',
      bottom: 0,
      top: Device.getDeviceHeight() * 0.3,
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      height: '100%',
    },
    notch: {
      width: 48,
      height: 5,
      borderRadius: 4,
      backgroundColor: colors.border.default,
      marginTop: 4,
      alignSelf: 'center',
    },
    rpcMenu: {
      paddingHorizontal: 16,
      flex: 1,
    },
    wrapper: {
      backgroundColor: colors.background.default,
      flexGrow: 1,
      flexDirection: 'column',
    },
    informationWrapper: {
      flex: 1,
      paddingHorizontal: 16,
    },
    informationCustomWrapper: {},
    scrollWrapper: {
      flex: 1,
      paddingVertical: 12,
    },
    scrollWrapperOverlay: {
      flex: 1,
      paddingVertical: 12,
      opacity: 0.5,
    },
    onboardingInput: {
      borderColor: staticColors.transparent,
      padding: 0,
    },
    inputDisabled: {
      borderColor: colors.border.muted,
      color: colors.text.muted,
    },
    input: {
      ...fontStyles.normal,
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
      padding: 10,
      color: colors.text.default,
    },
    dropDownInput: {
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
    },
    inputWithError: {
      ...typography.sBodyMD,
      fontFamily: getFontFamily(TextVariant.BodyMD),
      borderColor: colors.error.default,
      borderRadius: 5,
      borderWidth: 1,
      paddingTop: 2,
      paddingBottom: 12,
      paddingHorizontal: 12,
      color: colors.text.default,
    },
    inputWithFocus: {
      ...typography.sBodyMD,
      fontFamily: getFontFamily(TextVariant.BodyMD),
      borderColor: colors.primary.default,
      borderRadius: 5,
      borderWidth: 2,
      paddingTop: 2,
      paddingBottom: 12,
      paddingHorizontal: 12,
      color: colors.text.default,
    },
    warningText: {
      ...fontStyles.normal,
      color: colors.error.default,
      marginTop: 4,
      paddingLeft: 2,
      paddingRight: 4,
    },
    warningContainer: {
      marginTop: 16,
      flexGrow: 1,
      flexShrink: 1,
    },
    newWarningContainer: {
      flexGrow: 1,
      flexShrink: 1,
    },
    label: {
      fontSize: 14,
      paddingVertical: 12,
      color: colors.text.default,
      ...fontStyles.bold,
    },
    link: {
      color: colors.primary.default,
    },
    title: {
      fontSize: 20,
      paddingVertical: 12,
      color: colors.text.default,
      ...fontStyles.bold,
    },
    desc: {
      fontSize: 14,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    messageWarning: {
      paddingVertical: 2,
      fontSize: 14,
      color: colors.warning.default,
      ...typography.sBodyMD,
      fontFamily: getFontFamily(TextVariant.BodyMD),
    },
    inlineWarning: {
      paddingVertical: 2,
      fontSize: 14,
      color: colors.text.default,
      ...typography.sBodyMD,
      fontFamily: getFontFamily(TextVariant.BodyMD),
    },
    inlineWarningMessage: {
      paddingVertical: 2,
      color: colors.warning.default,
      ...typography.sBodyMD,
      fontFamily: getFontFamily(TextVariant.BodyMD),
    },
    buttonsWrapper: {
      marginVertical: 12,
      flexDirection: 'row',
      alignSelf: 'flex-end',
    },
    buttonsContainer: {
      flex: 1,
      flexDirection: 'column',
      alignSelf: 'flex-end',
    },
    editableButtonsContainer: {
      flex: 1,
      flexDirection: 'row',
    },
    networksWrapper: {
      marginTop: 12,
    },
    popularNetwork: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: 12,
    },
    button: {
      flex: 1,
    },
    disabledButton: {
      backgroundColor: colors.primary.muted,
    },
    cancel: {
      marginRight: 16,
    },
    blueText: {
      color: colors.primary.default,
      marginTop: 1,
    },
    bottomSection: {
      flex: 1,
      flexDirection: 'column',
    },
    rpcTitleWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
  });
