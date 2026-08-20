import React, { forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';

const FoxRiveLoaderAnimation = forwardRef((_props, ref) => {
  useImperativeHandle(ref, () => ({
    stop: jest.fn(),
  }));

  return (
    <View testID="fox-rive-loader-animation">
      <View testID="mock-static-image" />
    </View>
  );
});

FoxRiveLoaderAnimation.displayName = 'FoxRiveLoaderAnimation';

export default FoxRiveLoaderAnimation;
