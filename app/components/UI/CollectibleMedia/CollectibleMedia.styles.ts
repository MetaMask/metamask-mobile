import { StyleSheet } from 'react-native';
import scaling from '../../../util/scaling';
import Device from '../../../util/device';

import { MEDIA_WIDTH_MARGIN } from './Collectible.constants';
import { ThemeColors } from '@metamask/design-tokens/dist/types/js/themes/types';

export const createContainerStyle = (backgroundColor?: string) => ({
  flex: 0,
  borderRadius: 12,
  backgroundColor: `#${backgroundColor}`,
});

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    tinyImage: {
      width: 32,
      height: 32,
    },
    smallImage: {
      width: 50,
      height: 50,
    },
    bigImage: {
      height: 260,
      width: 260,
    },
    cover: {
      height: scaling.scale(Device.getDeviceWidth() - MEDIA_WIDTH_MARGIN, {
        baseModel: 2,
      }),
    },
    image: {
      borderRadius: 12,
    },
    textContainer: {
      alignItems: 'center',
      justifyContent: 'flex-start',
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
    },
    textWrapper: {
      textAlign: 'center',
      marginTop: 16,
    },
    textWrapperIcon: {
      textAlign: 'center',
      fontSize: 18,
      marginTop: 16,
    },
    mediaPlayer: {
      minHeight: 10,
    },
    imageFallBackTextContainer: StyleSheet.absoluteFillObject,
    imageFallBackShowContainer: {
      bottom: 32,
    },
    imageFallBackShowContainerCover: {
      bottom: 48,
    },
    // eslint-disable-next-line react-native/no-color-literals
    imageFallBackText: {
      textAlign: 'center',
      marginTop: 16,
      color: 'black',
    },
    imageFallBackShowText: {
      alignSelf: 'center',
    },
  });

export default createStyles;
