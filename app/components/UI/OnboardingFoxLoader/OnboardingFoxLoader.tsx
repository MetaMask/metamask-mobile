import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
} from 'react';
import {
  Alignment,
  Fit,
  RiveView,
  useRive,
  useRiveFile,
} from '@rive-app/react-native';
import { brandColor } from '@metamask/design-tokens';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import onboardingRiveFile from '../../../animations/fox_loading.riv';
import { colors } from '../../../styles/common';
import { getScreenDimensions } from '../../../util/onboarding';
import { hasTestOverrides } from '../../../util/test/utils';
import { useTheme } from '../../../util/theme';
import { AppThemeKey } from '../../../util/theme/models';

export interface OnboardingFoxLoaderRef {
  stop: () => void;
}

export const getOnboardingFoxLoaderBackgroundColor = (
  themeAppearance: AppThemeKey.light | AppThemeKey.dark,
) =>
  themeAppearance === AppThemeKey.dark
    ? brandColor.black
    : colors.gettingStartedPageBackgroundColorLightMode;

const OnboardingFoxLoader = forwardRef<OnboardingFoxLoaderRef>(
  (_props, ref) => {
    const { riveFile } = useRiveFile(onboardingRiveFile);
    const { riveRef, riveViewRef, setHybridRef } = useRive();
    const { themeAppearance } = useTheme();
    const tw = useTailwind();
    const { screenWidth, animationHeight } = getScreenDimensions();

    useImperativeHandle(
      ref,
      () => ({
        stop: () => {
          riveRef.current?.pause();
        },
      }),
      [riveRef],
    );

    const riveAnimationStyle = useMemo(
      () => ({
        width: screenWidth * 0.4,
        height: animationHeight,
      }),
      [screenWidth, animationHeight],
    );

    useEffect(() => {
      if (hasTestOverrides || !riveViewRef) return;
      riveViewRef.triggerInput('Loader2');
    }, [riveViewRef]);

    const backgroundColor =
      getOnboardingFoxLoaderBackgroundColor(themeAppearance);

    return (
      <Box
        testID="fox-rive-loader-animation"
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="flex-1"
        style={tw.style({ backgroundColor })}
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
    );
  },
);

OnboardingFoxLoader.displayName = 'OnboardingFoxLoader';

export default OnboardingFoxLoader;
