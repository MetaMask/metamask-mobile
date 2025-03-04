import { StyleSheet, Dimensions } from 'react-native';
import { Colors } from '../../../util/theme/models';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const CAROUSEL_HEIGHT = 59;
const DOTS_HEIGHT = 18;
const PEEK_WIDTH = 5;
export const IMAGE_WIDTH = 60;
export const IMAGE_HEIGHT = 59;

export const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      width: BANNER_WIDTH + PEEK_WIDTH * 2,
      alignSelf: 'center',
      height: CAROUSEL_HEIGHT + DOTS_HEIGHT,
      overflow: 'visible',
    },
    bannerContainer: {
      height: CAROUSEL_HEIGHT,
      overflow: 'visible',
    },
    containerSingleSlide: {
      height: CAROUSEL_HEIGHT,
    },
    slideContainer: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      height: CAROUSEL_HEIGHT,
      borderWidth: 1,
      borderColor: colors.border.muted,
      width: BANNER_WIDTH,
      marginHorizontal: PEEK_WIDTH,
      position: 'relative',
    },
    slideContainerPressed: {
      backgroundColor: colors.background.alternativePressed,
    },
    slideContent: {
      width: '100%',
      height: '100%',
      flexDirection: 'row',
      alignItems: 'center',
    },
    imageContainer: {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
    },
    textContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    textWrapper: {
      width: BANNER_WIDTH - IMAGE_WIDTH,
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
    },
    title: {
      color: colors.text.default,
      fontSize: 12,
      fontWeight: '500',
      marginLeft: 14,
    },
    description: {
      color: colors.text.default,
      fontSize: 10.4,
      marginLeft: 14,
      marginTop: -4,
    },
    closeButton: {
      position: 'absolute',
      top: 4,
      right: 6,
      width: 26,
      height: 26,
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'flex-end',
      height: DOTS_HEIGHT,
      gap: 8,
    },
    progressDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.icon.muted,
      margin: 0,
    },
    progressDotActive: {
      backgroundColor: colors.icon.default,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.alternative,
    },
  });
