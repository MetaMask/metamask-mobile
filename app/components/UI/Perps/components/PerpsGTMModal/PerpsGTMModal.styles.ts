import { Platform, StyleSheet, Dimensions } from 'react-native';

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
      backgroundColor: theme.colors.background.default,
    },
    scrollableContent: {
      flex: 1,
    },
    scrollContentContainer: {
      flexGrow: 1,
    },
    headerContainer: {
      alignItems: 'center',
      paddingTop: scaleVertical(50),
      paddingHorizontal: scaleHorizontal(16),
      marginBottom: scaleVertical(20),
    },
    contentImageContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 'auto',
    },
    image: {
      width: '100%',
      height: scaleVertical(380),
      resizeMode: 'contain',
    },
    title: {
      textAlign: 'center',
      paddingTop: scaleVertical(12),
    },
    footerContainer: {
      display: 'flex',
      rowGap: scaleVertical(8),
      paddingHorizontal: scaleHorizontal(30),
      paddingBottom: scaleVertical(12),
    },
  });

export default createStyles;
