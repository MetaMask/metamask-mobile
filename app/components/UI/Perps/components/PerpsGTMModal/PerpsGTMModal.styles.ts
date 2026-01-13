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

const createStyles = (
  theme: Theme,
  isDarkMode: boolean,
  titleFontSize?: number | null,
  subtitleFontSize?: number | null,
  useSystemFont?: boolean,
) =>
  StyleSheet.create({
    pageContainer: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    headerContainer: {
      alignItems: 'center',
      paddingTop: scaleVertical(50),
      paddingHorizontal: scaleHorizontal(16),
      minHeight: '35%',
      maxHeight: '40%',
    },
    contentImageContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: scaleHorizontal(20),
      paddingVertical: scaleVertical(10),
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
      minWidth: '80%',
      minHeight: '80%',
    },
    title: {
      fontSize: titleFontSize || scaleFont(useSystemFont ? 44 : 47), // Slightly smaller base for system fonts
      lineHeight: titleFontSize
        ? titleFontSize + 1
        : scaleFont(useSystemFont ? 46 : 48),
      textAlign: 'center',
      paddingTop: scaleVertical(12),
      fontFamily: useSystemFont
        ? Platform.OS === 'ios'
          ? 'System'
          : 'Roboto'
        : 'MMPoly-Regular',
      fontWeight: useSystemFont
        ? '700'
        : Platform.OS === 'ios'
          ? '900'
          : 'normal',
    },
    titleDescription: {
      paddingTop: scaleVertical(10),
      paddingHorizontal: scaleHorizontal(8),
      textAlign: 'center',
      fontSize: subtitleFontSize || scaleFont(16),
      lineHeight: subtitleFontSize ? subtitleFontSize + 4 : scaleFont(20),
      fontFamily: useSystemFont
        ? Platform.OS === 'ios'
          ? 'System'
          : 'Roboto'
        : 'Geist-Regular',
      fontWeight: '500',
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
