/* eslint-disable @metamask/design-tokens/color-no-hex */
import { Platform, StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';
import { FontWeight } from '@metamask/design-system-react-native';

export const GRADIENT_COLORS = ['#1D002E', '#360853'];

// Platform-specific base dimensions
const BASE_WIDTH = 375;
const BASE_HEIGHT_IOS = 812; // iPhone X/11/12/13/14/15 Pro base
const BASE_HEIGHT_ANDROID = 736; // Common Android base

const MIN_SCREEN_HEIGHT_FOR_SMALL_SCREEN_STYLES = 750;

// Calculate platform-aware scaling factors
const isIOS = Platform.OS === 'ios';
const baseHeight = isIOS ? BASE_HEIGHT_IOS : BASE_HEIGHT_ANDROID;

export interface WindowDimensions {
  width: number;
  height: number;
}

// Platform-aware responsive scaling functions that accept current dimensions
const createScalingFunctions = (dimensions: WindowDimensions) => {
  const { width: screenWidth, height: screenHeight } = dimensions;

  const widthScale = screenWidth / BASE_WIDTH;

  // For vertical spacing, use percentage of available height instead of pure scaling
  const scaleVertical = (size: number) => {
    // Use percentage of screen height for more consistent spacing
    const percentage = size / baseHeight;
    return Math.ceil(screenHeight * percentage);
  };

  const scaleHorizontal = (size: number) => Math.ceil(size * widthScale);

  return {
    screenWidth,
    screenHeight,
    scaleVertical,
    scaleHorizontal,
  };
};

const createStyles = (theme: Theme, dimensions: WindowDimensions) => {
  const { screenWidth, screenHeight, scaleVertical, scaleHorizontal } =
    createScalingFunctions(dimensions);

  const isSmallScreen =
    screenHeight < MIN_SCREEN_HEIGHT_FOR_SMALL_SCREEN_STYLES;

  // Outer box for the static PNG (`resizeMode: 'contain'`). Unchanged — the
  // 1:1 PNG letterboxes correctly inside this rect.
  const imageWidth = isSmallScreen ? screenWidth * 0.95 : screenWidth * 1.2;
  const imageHeight = isSmallScreen ? screenHeight * 0.55 : screenHeight * 0.7;

  // Rive uses the same wide/tall box as `image` so Fit.Contain scales the
  // (taller-than-wide) artboard by height and the cards stay as wide as the
  // original. A square box letterboxed the sides and looked too narrow.
  // Shift the box up so its bottom sits behind Set up now (~88% / ~85%),
  // matching where the PNG's rendered content ended.
  const imageContainerTopRatio = isSmallScreen ? 0.34 : 0.25;
  const animationBottomRatio = isSmallScreen ? 0.85 : 0.88;
  const animationMarginTop =
    screenHeight * (animationBottomRatio - imageContainerTopRatio) -
    imageHeight;

  return StyleSheet.create({
    pageContainer: {
      flex: 1,
      position: 'relative',
      maxHeight: '100%',
      width: '100%',
      // Background is handled by LinearGradient wrapper
    },
    headerContainer: {
      alignItems: 'center',
      paddingHorizontal: scaleHorizontal(16),
      paddingVertical: scaleVertical(16),
      zIndex: 2,
    },
    hiddenText: {
      opacity: 0,
    },
    title: {
      fontFamily: 'MMPoly-Regular',
      fontWeight: FontWeight.Regular,
      // make it smaller on smaller screens
      fontSize: isSmallScreen ? 40 : 45,
      lineHeight: isSmallScreen ? 40 : 45, // 100% of font size
      letterSpacing: 0,
      textAlign: 'center',
      paddingTop: scaleVertical(isSmallScreen ? 8 : 12),
      color: theme.colors.accent02.light,
    },
    titleDescription: {
      // make it smaller on smaller screens
      fontSize: isSmallScreen ? 14 : 16,
      paddingTop: scaleVertical(10),
      paddingHorizontal: scaleHorizontal(8),
      textAlign: 'center',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', // Default system font
      fontWeight: FontWeight.Medium,
      lineHeight: 24, // Line Height BodyMd
      letterSpacing: 0,
      color: theme.colors.accent02.light,
    },
    imageContainer: {
      position: 'absolute',
      // Push image further down on smaller screens to avoid overlapping with header text
      top: isSmallScreen ? '34%' : '25%',
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'flex-start',
      zIndex: 1,
    },
    image: {
      width: imageWidth,
      height: imageHeight,
      resizeMode: 'contain',
    },
    // Same size as `image` for scale, shifted up so the bottom edge sits
    // behind Set up now. Paired with Alignment.BottomCenter on RiveView.
    animation: {
      width: imageWidth,
      height: imageHeight,
      marginTop: animationMarginTop,
    },
    footerContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: scaleHorizontal(30),
      paddingBottom: scaleVertical(2),
      zIndex: 3,
    },
    footerContent: {
      display: 'flex',
      rowGap: scaleVertical(8),
    },
  });
};

export default createStyles;
