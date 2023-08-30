import { StyleSheet } from 'react-native';
import scaling from '../../../util/scaling';
import Device from '../../../util/device';

import { MEDIA_WIDTH_MARGIN } from './Collectible.constants';

const createStyles = (colors: any) =>
  StyleSheet.create({
    container(backgroundColor: string) {
      return {
        flex: 0,
        borderRadius: 12,
        backgroundColor: `#${backgroundColor}`,
      };
    },
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
      textAlign: 'center',
      width: '100%',
    },
  });

export default createStyles;
