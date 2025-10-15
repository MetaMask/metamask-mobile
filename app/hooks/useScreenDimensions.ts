import { useMemo } from 'react';
import { Dimensions } from 'react-native';
import Device from '../util/device';

export interface ScreenDimensions {
  screenWidth: number;
  screenHeight: number;
  animationHeight: number;
}

export const useScreenDimensions = (): ScreenDimensions =>
  useMemo(() => {
    const { width, height } = Dimensions.get('window');

    const animationHeightRatio = Device.isSmallDevice() ? 0.4 : 0.5;

    return {
      screenWidth: width,
      screenHeight: height,
      animationHeight: height * animationHeightRatio,
    };
  }, []);
