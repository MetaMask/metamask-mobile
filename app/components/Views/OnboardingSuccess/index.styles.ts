import { StyleSheet } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    root: {
      flex: 1,
      paddingBottom: 32,
    },
    contentContainer: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100%',
    },
    contentWrapper: {
      flex: 1,
      padding: 24,
      height: '100%',
    },
    buttonWrapper: {
      paddingHorizontal: 24,
      marginTop: 'auto',
      flex: 1,
      justifyContent: 'flex-end',
      height: '100%',
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
      rowGap: 16,
      paddingTop: 24,
      padding: 24,
    },
    hintDescriptionWrapper: {
      flexDirection: 'column',
      rowGap: 20,
    },
    hintInput: {
      borderWidth: 1,
      borderColor: colors.border.default,
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
      width: '90%',
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
    iconWrapper: {
      marginRight: 6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    linkWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  });

export default createStyles;
