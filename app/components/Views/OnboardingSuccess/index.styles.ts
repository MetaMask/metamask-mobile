import { StyleSheet } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    root: {
      flexGrow: 1,
      paddingBottom: 32,
    },
    contentContainer: {
      flexDirection: 'column',
      flexGrow: 1,
      justifyContent: 'space-between',
      rowGap: 16,
    },
    contentWrapper: {
      flex: 1,
      paddingHorizontal: 16,
    },
    buttonWrapper: {
      paddingHorizontal: 16,
      marginTop: 'auto',
      flex: 1,
      justifyContent: 'flex-end',
      height: '100%',
      marginBottom: 16,
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
    walletReadyImage: {
      marginHorizontal: 'auto',
      marginVertical: 20,
      alignSelf: 'center',
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
