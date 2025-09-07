import { StyleSheet } from 'react-native';
import Device from '../../../util/device';
import { Theme } from '@metamask/design-tokens';

const modalPadding = 24;
const screenWidth = Device.getDeviceWidth();
const screenHeight = Device.getDeviceHeight();
const slideItemWidth = screenWidth; // Full width for fullscreen modal
const maxSlideItemHeight = screenHeight - 200;
const slideImageWidth = slideItemWidth - modalPadding * 2;
const imageAspectRatio = 128 / 264;
const slideImageHeight = slideImageWidth * imageAspectRatio;

/**
 * Style sheet function for WhatsNewModal component.
 *
 * @param params - Parameters for styling.
 * @param params.theme - Theme colors and fonts.
 * @returns StyleSheet object.
 */
const createStyles = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    header: {
      alignItems: 'center',
      marginTop: 16,
    },
    slideContent: {
      maxHeight: maxSlideItemHeight,
    },
    horizontalScrollView: {
      flexGrow: 0,
    },
    slideItemContainer: {
      flex: 1,
      width: slideItemWidth,
      paddingHorizontal: modalPadding,
      paddingBottom: 16,
      paddingTop: 8,
    },
    slideImageContainer: {
      flexDirection: 'column',
      borderRadius: 10,
      marginBottom: 24,
    },
    slideTitle: {
      marginBottom: 12,
    },
    slideDescription: {
      lineHeight: 20,
    },
    button: {
      marginTop: 24,
    },
    progressIndicatorsContainer: {
      flexDirection: 'row',
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 8,
    },
    slideCircle: {
      width: 8,
      height: 8,
      borderRadius: 8 / 2,
      backgroundColor: theme.colors.icon.default,
      opacity: 0.3,
      marginHorizontal: 4,
    },
    slideSolidCircle: {
      opacity: 1,
      backgroundColor: theme.colors.primary.default,
    },
    featureCheckmark: {
      marginRight: 12,
      marginTop: 2, // Align with text baseline
    },
    featureText: {
      flex: 1,
      marginBottom: 0,
    },
    previewImage: {
      width: slideImageWidth,
      height: slideImageHeight * 1.5, // Taller for the preview mockups to match design
      borderRadius: 12,
      alignSelf: 'center',
    },
    // Image carousel specific styles
    imageCarousel: {
      flexGrow: 0,
    },
    carouselImageContainer: {
      width: slideImageWidth,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    imageProgressContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    imageProgressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.icon.default,
      opacity: 0.3,
      marginHorizontal: 4,
    },
    imageProgressDotActive: {
      opacity: 1,
      backgroundColor: theme.colors.primary.default,
    },
    descriptionsContainer: {
      marginTop: 16,
    },
    descriptionItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
  });

export default createStyles;
