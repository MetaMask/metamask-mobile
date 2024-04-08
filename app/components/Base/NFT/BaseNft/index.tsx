import React from 'react';
import { View } from 'react-native';
import { FastImageProps, Source } from 'react-native-fast-image';

export interface BaseNftProps extends FastImageProps {
  fallbackImg?: Source | number;
  blurred?: boolean;
  disabled?: boolean;
  animationUrl?: string;
  interactionType?: 'gyro' | 'touch';
  background?: React.ReactNode;
}
export const BaseNft = () => (
  <View>
    {/* [] render NFTShowCase here */}
    {/* [] render SmartActionsCarousel here */}
    {/* [] render renderContent here */}
  </View>
);
