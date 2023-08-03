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
      justifyContent: 'center',
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
    },
    textWrapper: {
      textAlign: 'center',
    },
    textWrapperIcon: {
      textAlign: 'center',
      fontSize: 18,
    },
    mediaPlayer: {
      minHeight: 10,
    },
  });

export default createStyles;
