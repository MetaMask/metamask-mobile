import React from 'react';
import { View } from 'react-native';

const FoxRiveLoaderAnimation: React.FC = () => (
  <View accessibilityRole="none" accessible={false} testID="fox-rive-loader-animation">
    <View accessibilityRole="none" accessible={false} testID="mock-static-image" />
  </View>
);

export default FoxRiveLoaderAnimation;
