/* eslint-disable import-x/prefer-default-export */
import Device from '../device';
import { Dimensions } from 'react-native';

export const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');

  const animationHeightRatio =
    Device.isSmallDevice() || Device.isMediumDevice() ? 0.4 : 0.5;

  return {
    screenWidth: width,
    screenHeight: height,
    animationHeight: height * animationHeightRatio,
  };
};
