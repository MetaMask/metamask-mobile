/* eslint-disable import/prefer-default-export */
import { Platform, StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    mainWrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    topOverlay: {
      flex: 1,
      backgroundColor: colors.primary.muted,
    },
    wrapper: {
      flexGrow: 1,
    },
    content: {
      alignItems: 'flex-start',
    },
    title: {
      fontSize: 32,
      color: colors.text.default,
      justifyContent: 'center',
      textAlign: 'left',
      ...fontStyles.normal,
      lineHeight: 40,
    },
    scanPkeyRow: {
      width: '100%',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonWrapper: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingBottom: Platform.select({
        ios: 36,
        android: 24,
      }),
      backgroundColor: colors.background.default,
    },
    top: {
      paddingTop: 0,
      padding: 24,
      width: '100%',
    },
    bottom: {
      width: '100%',
      paddingHorizontal: 16,
      paddingVertical: 24,
      backgroundColor: colors.background.default,
    },
    input: {
      backgroundColor: colors.background.default,
      fontSize: 14,
      borderRadius: 6,
      height: 120,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.muted,
      ...fontStyles.normal,
      color: colors.text.muted,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginVertical: 16,
    },
    navbarRightButton: {
      alignSelf: 'flex-end',
      marginRight: 16,
      marginTop: Device.isIphoneX() ? 40 : 24,
    },
    textContainer: {
      width: '90%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      rowGap: 24,
      marginTop: 16,
      paddingLeft: 12,
    },
  });

export { createStyles };
