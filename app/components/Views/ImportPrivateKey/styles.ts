/* eslint-disable import/prefer-default-export */
import { Platform, StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';

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
        ios: 0,
        android: 24,
      }),
      backgroundColor: colors.background.default,
    },
    top: {
      paddingTop: 0,
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
      fontSize: 16,
      borderRadius: 8,
      height: 120,
      ...fontStyles.normal,
      color: colors.text.alternative,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginVertical: 8,
      lineHeight: 24,
    },
    navbarLeftButton: {
      alignSelf: 'flex-start',
      marginLeft: 16,
    },
    textContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      rowGap: 8,
      marginTop: 16,
      paddingHorizontal: 16,
    },
    descriptionText: {
      fontSize: 16,
      lineHeight: 24,
    },
    subtitleText: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '500',
    },
    learnMoreText: {
      fontSize: 16,
      lineHeight: 24,
    },
  });

export { createStyles };
