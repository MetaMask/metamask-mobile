import { StyleSheet } from 'react-native';
import Device from '../../../util/device';
import { Theme } from '@metamask/design-tokens';

const modalPadding = 24;
const screenWidth = Device.getDeviceWidth();
const screenHeight = Device.getDeviceHeight();
const slideItemWidth = screenWidth;
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
      textAlign: 'center',
      marginTop: 16,
      fontWeight: 'bold',
    },
    headerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    slideContent: {
      maxHeight: screenHeight,
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
      marginBottom: 16,
    },
    marginBottom: {
      marginBottom: 0,
    },
    slideTitle: {
      marginBottom: 12,
    },
    slideDescription: {},
    moreInformation: {
      marginTop: 16,
    },
    button: {
      marginTop: 16,
    },
    featureCheckmark: {
      marginRight: 12,
      marginTop: 2,
    },
    featureText: {
      flex: 1,
    },
    previewImage: {
      width: slideImageWidth - 7.5,
      height: slideImageHeight * 1.5,
      borderRadius: 12,
      alignSelf: 'center',
    },
    imageCarousel: {
      flexGrow: 0,
    },
    carouselImageContainer: {
      width: slideImageWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    imageProgressContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    imageProgressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.text.muted,
      marginHorizontal: 2,
    },
    imageProgressDotActive: {
      width: 24,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.text.default,
    },
    descriptionsContainer: {
      marginTop: 16,
    },
    descriptionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
  });

export default createStyles;
