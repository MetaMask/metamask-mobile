import { Platform, StyleSheet, Dimensions } from 'react-native';
import { colors as importedColors } from '../../../../../styles/common';
import { Theme } from '@metamask/design-tokens';

// Responsive scaling utilities
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Platform-specific base dimensions
const BASE_WIDTH = 375;
const BASE_HEIGHT_IOS = 812; // iPhone X/11/12/13/14/15 Pro base
const BASE_HEIGHT_ANDROID = 736; // Common Android base

// Calculate platform-aware scaling factors
const isIOS = Platform.OS === 'ios';
const baseHeight = isIOS ? BASE_HEIGHT_IOS : BASE_HEIGHT_ANDROID;

const widthScale = screenWidth / BASE_WIDTH;
const heightScale = screenHeight / baseHeight;

// Use more conservative scaling to prevent excessive padding
const scale = Math.min(widthScale, heightScale);
const conservativeScale = Math.min(scale, 1.2); // Cap scaling at 120%

// Platform-aware responsive scaling functions
const scaleSize = (size: number) => Math.ceil(size * conservativeScale);
const scaleFont = (size: number) => Math.ceil(size * conservativeScale);

// For vertical spacing, use percentage of available height instead of pure scaling
const scaleVertical = (size: number) => {
  // Use percentage of screen height for more consistent spacing
  const percentage = size / baseHeight;
  return Math.ceil(screenHeight * percentage);
};

const scaleHorizontal = (size: number) => Math.ceil(size * widthScale);

const createStyles = (theme: Theme, isDarkMode: boolean) =>
  StyleSheet.create({
    pageContainer: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    contentContainer: {
      alignItems: 'center',
      paddingTop: scaleVertical(50),
      flexGrow: 1,
    },
    image: {
      flexShrink: 1,
      marginTop: scaleVertical(20),
      width: '100%',
    },
    title: {
      fontSize: scaleFont(47),
      lineHeight: scaleFont(48),
      textAlign: 'center',
      paddingTop: scaleVertical(12),
      paddingHorizontal: scaleHorizontal(16),
      fontFamily: Platform.OS === 'ios' ? 'MM Poly' : 'MM Poly Regular',
      ...(Platform.OS === 'ios' ? { fontWeight: '900' } : {}),
    },
    titleDescription: {
      paddingTop: scaleVertical(10),
      paddingHorizontal: scaleHorizontal(8),
      marginBottom: scaleVertical(16),
      textAlign: 'center',
      fontSize: scaleFont(16),
      fontFamily: 'Geist-Regular',
      fontWeight: '500',
    },
    ctas: {
      flex: 1,
      width: '100%',
      paddingHorizontal: scaleHorizontal(30),
    },
    footerContainer: {
      display: 'flex',
      rowGap: scaleVertical(8),
      paddingHorizontal: scaleHorizontal(30),
      paddingBottom: scaleVertical(12),
    },
    tryNowButton: {
      borderRadius: scaleSize(12),
      backgroundColor: isDarkMode
        ? importedColors.white
        : importedColors.btnBlack,
    },
    tryNowButtonText: {
      color: isDarkMode ? importedColors.btnBlack : importedColors.white,
      fontWeight: '600',
      fontSize: scaleFont(16),
    },
    notNowButton: {
      borderRadius: scaleSize(12),
      backgroundColor: theme.colors.background.default,
      borderWidth: 1,
      borderColor: importedColors.transparent,
    },
    notNowButtonText: {
      fontWeight: '500',
      fontSize: scaleFont(16),
    },
  });

export default createStyles;
