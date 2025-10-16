import { StyleSheet, Platform } from 'react-native';
import { ThemeColors } from '@metamask/design-tokens';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    animationSection: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonSection: {
      paddingBottom: 4,
      alignItems: 'center',
      rowGap: 16,
    },
    emoji: {
      textAlign: 'center',
      fontSize: 65,
      marginBottom: 16,
    },
    title: {
      paddingTop: 20,
      fontSize: 24,
      fontWeight: '700',
      textAlign: 'left',
    },
    hintWrapper: {
      flexDirection: 'column',
      flexGrow: 1,
      justifyContent: 'space-between',
      rowGap: 16,
      paddingHorizontal: 24,
      marginBottom: 16,
    },
    hintContent: {
      flexDirection: 'column',
      gap: 16,
    },
    hintDescriptionWrapper: {
      flexDirection: 'column',
      rowGap: 20,
    },
    hintInput: {
      borderRadius: 8,
      padding: 16,
    },
    textTitle: {
      marginTop: 25,
      marginBottom: 16,
      marginHorizontal: 16,
      textAlign: 'center',
      fontFamily:
        Platform.OS === 'android' ? 'MM Sans Regular' : 'MMSans-Regular',
    },
    footerLink: {
      paddingVertical: 8,
      alignItems: 'center',
    },
    imageWrapper: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 200,
      height: 200,
      padding: 20,
      marginHorizontal: 'auto',
    },
    walletReadyImage: {
      alignSelf: 'center',
      width: 200,
      height: 200,
    },
    description: {
      fontSize: 14,
      textAlign: 'left',
      marginTop: 14,
      lineHeight: 22,
      fontWeight: '400',
    },
    descriptionBold: {
      fontSize: 14,
      textAlign: 'left',
      fontWeight: '700',
    },
    descriptionWrapper: {
      width: '100%',
      flexDirection: 'column',
      rowGap: 16,
      marginTop: 24,
    },
    footerWrapper: {
      marginVertical: 24,
      flexDirection: 'column',
      rowGap: 16,
    },
    footer: {
      backgroundColor: colors.background.muted,
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderRadius: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 12,
    },
    linkWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      columnGap: 12,
    },
    headerLeft: {
      marginLeft: 16,
    },
    hintTextWrapper: {
      flexDirection: 'column',
      rowGap: 0,
      justifyContent: 'flex-start',
    },
  });

export default createStyles;
