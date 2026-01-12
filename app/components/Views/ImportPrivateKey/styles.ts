/* eslint-disable import/prefer-default-export */
import { StyleSheet, Platform } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { Colors } from '../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    mainWrapper: {
      flex: 1,
      marginTop: 48,
    },
    topOverlay: {
      flex: 1,
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
      paddingHorizontal: 16,
      width: '100%',
    },
    bottom: {
      width: '100%',
      paddingHorizontal: 16,
      paddingVertical: 24,
      backgroundColor: colors.background.default,
    },
    input: {
      backgroundColor: colors.background.section,
      fontSize: 14,
      borderRadius: 6,
      height: 120,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.muted,
      ...fontStyles.normal,
      color: colors.text.muted,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginVertical: 8,
    },
    textContainer: {
      width: '90%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      rowGap: 8,
      marginTop: 16,
    },
  });

export { createStyles };
