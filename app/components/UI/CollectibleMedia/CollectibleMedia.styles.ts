import { StyleSheet } from 'react-native';
import scaling from '../../../util/scaling';
import Device from '../../../util/device';
import { Theme } from '../../../util/theme/models';

import { MEDIA_WIDTH_MARGIN } from './Collectible.constants';

/**
 * Style sheet
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Stylesheet vars.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: { backgroundColor?: string };
}) => {
  const {
    vars: { backgroundColor },
    theme: { colors },
  } = params;

  return StyleSheet.create({
    container: {
      flex: 0,
      borderRadius: 12,
      backgroundColor: backgroundColor ? `#${backgroundColor}` : undefined,
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
      flex: 1,
      textAlign: 'center',
      marginTop: 16,
    },
    textWrapperIcon: {
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
};

export default styleSheet;
