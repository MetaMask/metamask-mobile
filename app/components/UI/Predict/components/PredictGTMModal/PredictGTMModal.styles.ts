import { Platform, StyleSheet, Dimensions } from 'react-native';
import { colors as importedColors } from '../../../../../styles/common';
import { Theme } from '@metamask/design-tokens';

// Responsive scaling utilities
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Platform-specific base dimensions
const BASE_WIDTH = 375;
const BASE_HEIGHT_IOS = 812; // iPhone X/11/12/13/14/15 Pro base
const BASE_HEIGHT_ANDROID = 736; // Common Android base

const MIN_SCREEN_HEIGHT_FOR_SMALL_SCREEN_STYLES = 750;

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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    pageContainer: {
      flex: 1,
      position: 'relative',
      maxHeight: '100%',
      width: '100%',
    },
    backgroundImage: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: screenWidth * 1.07, // 7% wider for edge coverage
      height:
        screenHeight *
        (screenHeight < MIN_SCREEN_HEIGHT_FOR_SMALL_SCREEN_STYLES
          ? 1.12
          : 1.14), // 12% taller for edge coverage
      resizeMode: 'cover',
    },
    contentContainer: {
      flex: 1,
    },
    headerContainer: {
      alignItems: 'center',
      paddingHorizontal: scaleHorizontal(16),
      paddingVertical: scaleVertical(16),
    },
    poweredByImage: {
      width: scaleHorizontal(200),
      height: scaleVertical(24),
      marginBottom: 8,
    },
    spacer: {
      flex: 1,
    },
    title: {
      fontFamily: 'MMPoly-Regular',
      fontWeight: '400',
      // make it smaller on smaller screens
      fontSize:
        screenHeight < MIN_SCREEN_HEIGHT_FOR_SMALL_SCREEN_STYLES ? 40 : 50,
      lineHeight:
        screenHeight < MIN_SCREEN_HEIGHT_FOR_SMALL_SCREEN_STYLES ? 40 : 50, // 100% of font size
      letterSpacing: 0,
      textAlign: 'center',
      paddingTop: scaleVertical(
        screenHeight < MIN_SCREEN_HEIGHT_FOR_SMALL_SCREEN_STYLES ? 8 : 12,
      ),
      color: theme.colors.accent02.light,
    },
    titleDescription: {
      // make it smaller on smaller screens
      fontSize:
        screenHeight < MIN_SCREEN_HEIGHT_FOR_SMALL_SCREEN_STYLES ? 14 : 16,
      paddingTop: scaleVertical(10),
      paddingHorizontal: scaleHorizontal(8),
      textAlign: 'center',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', // Default system font
      fontWeight: '500',
      lineHeight: 24, // Line Height BodyMd
      letterSpacing: 0,
      color: theme.colors.accent02.light,
    },
    footerContainer: {
      display: 'flex',
      rowGap: scaleVertical(8),
      paddingHorizontal: scaleHorizontal(30),
    },
    getStartedButton: {
      borderRadius: scaleSize(12),
      backgroundColor: importedColors.white,
    },
    getStartedButtonText: {
      color: importedColors.btnBlack,
      fontWeight: '600',
      fontSize: scaleFont(16),
    },
    notNowButton: {
      borderRadius: scaleSize(12),
      backgroundColor: importedColors.transparent,
      borderWidth: 0,
    },
    notNowButtonText: {
      color: importedColors.white,
      fontWeight: '500',
      fontSize: scaleFont(16),
    },
  });

export default createStyles;
