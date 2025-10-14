import { StyleSheet } from 'react-native';
import { ThemeColors } from '@metamask/design-tokens';
import { colors as importedColors } from '../../../styles/common';
import { EdgeInsets } from 'react-native-safe-area-context';

const createStyles = (
  colors: ThemeColors,
  isDarkMode: boolean = false,
  insets?: EdgeInsets,
) =>
  StyleSheet.create({
    root: {
      flexGrow: 1,
      paddingBottom: Math.max(16, (insets?.bottom || 0) + 8),
      backgroundColor: isDarkMode
        ? colors.background.default
        : importedColors.white,
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
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonWrapper: {
      paddingHorizontal: 0,
      marginTop: 4,
      marginBottom: 8,
    },
    buttonContainer: {
      position: 'absolute',
      bottom: Math.max(16, (insets?.bottom || 0) + 4),
      left: 0,
      right: 0,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: Math.max(40, (insets?.bottom || 0) + 8),
      backgroundColor: isDarkMode
        ? colors.background.default
        : importedColors.white,
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
      marginBottom: 16,
      marginHorizontal: 16,
      textAlign: 'center',
    },
    imageWrapper: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      marginTop: 40,
      marginBottom: 32,
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
      marginTop: 16,
      marginBottom: Math.max(16, (insets?.bottom || 0) + 8),
      flexDirection: 'column',
      rowGap: 16,
    },
    footer: {
      backgroundColor: colors.background.muted,
      paddingHorizontal: 16,
      paddingVertical: 12,
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
    animationContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
      marginHorizontal: -16,
    },
    riveAnimation: {
      width: '100%', // Full width to screen edges
      height: 300,
      alignSelf: 'stretch',
    },
    textOverlay: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      marginTop: 24,
    },
    footerLink: {
      alignItems: 'center',
      paddingVertical: 0,
    },
    subtitle: {
      fontSize: 16,
      textAlign: 'center',
      marginTop: 16,
      lineHeight: 22,
      color: colors.text.alternative,
    },
    fadeOutContainer: {
      position: 'absolute',
    },
    fadeInContainer: {
      opacity: 1,
    },
  });

export default createStyles;
