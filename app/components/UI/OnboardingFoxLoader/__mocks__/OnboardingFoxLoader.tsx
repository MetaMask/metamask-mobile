import React, { forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';

const OnboardingFoxLoader = forwardRef((_props, ref) => {
  useImperativeHandle(ref, () => ({
    stop: jest.fn(),
  }));

  return <View testID="fox-rive-loader-animation" />;
});

OnboardingFoxLoader.displayName = 'OnboardingFoxLoader';

export default OnboardingFoxLoader;
