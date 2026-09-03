import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
} from 'react';
import { ActivityIndicator } from 'react-native';
import {
  Alignment,
  Fit,
  RiveView,
  useRive,
  useRiveFile,
} from '@rive-app/react-native';
import { useTheme } from '../../../../util/theme';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import onboardingRiveFile from '../../../../animations/fox_loading.riv';
import { getScreenDimensions } from '../../../../util/onboarding';
import { hasTestOverrides } from '../../../../util/test/utils';

export interface FoxRiveLoaderAnimationRef {
  stop: () => void;
}

interface FoxRiveLoaderAnimationProps {}

const FoxRiveLoaderAnimation = forwardRef<
  FoxRiveLoaderAnimationRef,
  FoxRiveLoaderAnimationProps
>((_props, ref) => {
  const { riveFile } = useRiveFile(onboardingRiveFile);
  const { riveRef, riveViewRef, setHybridRef } = useRive();
  const { colors } = useTheme();
  const tw = useTailwind();
  const { screenWidth, animationHeight } = getScreenDimensions();

  useImperativeHandle(
    ref,
    () => ({
      // The Nitro runtime has no stop(); pause halts playback the same way
      // for this fire-and-forget loader.
      stop: () => {
        riveRef.current?.pause();
      },
    }),
    [riveRef],
  );

  const animationWrapperStyle = useMemo(
    () => ({ width: screenWidth, height: animationHeight }),
    [screenWidth, animationHeight],
  );

  const riveAnimationStyle = useMemo(
    () => ({
      ...tw.style('self-center bg-background-default'),
      width: screenWidth * 0.4,
      height: animationHeight,
    }),
    [screenWidth, animationHeight, tw],
  );

  const textWrapperStyle = useMemo(
    () => ({ width: screenWidth }),
    [screenWidth],
  );

  useEffect(() => {
    if (hasTestOverrides || !riveViewRef) return;
    riveViewRef.triggerInput('Loader2');
  }, [riveViewRef]);

  return (
    <Box
      testID="fox-rive-loader-animation"
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Start}
      twClassName="flex-1 bg-background-default pt-[30px]"
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="bg-background-default"
        style={animationWrapperStyle}
      >
        {riveFile && (
          <RiveView
            hybridRef={setHybridRef}
            file={riveFile}
            stateMachineName="FoxRaiseUp"
            style={riveAnimationStyle}
            autoPlay
            fit={Fit.Contain}
            alignment={Alignment.Center}
          />
        )}
      </Box>
      <Box
        justifyContent={BoxJustifyContent.End}
        twClassName="px-5"
        style={textWrapperStyle}
      >
        <ActivityIndicator size="large" color={colors.text.default} />
      </Box>
    </Box>
  );
});

FoxRiveLoaderAnimation.displayName = 'FoxRiveLoaderAnimation';

export default FoxRiveLoaderAnimation;
