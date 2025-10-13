import { useMemo } from 'react';
import { Dimensions } from 'react-native';

export interface ScreenDimensions {
  screenWidth: number;
  screenHeight: number;
  animationHeight: number;
}

export const useScreenDimensions = (): ScreenDimensions =>
  useMemo(() => {
    const { width, height } = Dimensions.get('window');
    return {
      screenWidth: width,
      screenHeight: height,
      animationHeight: height * 0.5,
    };
  }, []);
