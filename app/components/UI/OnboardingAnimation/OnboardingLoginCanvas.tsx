import React from 'react';
import { Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';

import FadeOutOverlay from '../FadeOutOverlay';
import FoxAnimation from '../FoxAnimation/FoxAnimation';
import { ScreenshotDeterrent } from '../ScreenshotDeterrent';
import { hasTestOverrides } from '../../../util/test/utils';
import OnboardingAnimation from './OnboardingAnimation';

/**
 * Shared canvas for the unlock and OAuth rehydration screens: cream or
 * background-default fill, the lifted wordmark, and the centered action column.
 */
const OnboardingLoginCanvas = ({
  canvasColor,
  containerTestID,
  startFoxAnimation,
  setStartFoxAnimation,
  renderWordmark,
  showScreenshotDeterrent = false,
  children,
}: {
  canvasColor: string;
  containerTestID: string;
  startFoxAnimation?: 'Loader' | 'Start';
  setStartFoxAnimation: (value: boolean) => void;
  renderWordmark?: (wordmark: React.ReactElement) => React.ReactNode;
  showScreenshotDeterrent?: boolean;
  children: React.ReactNode;
}) => {
  const tw = useTailwind();

  return (
    <Box
      twClassName="flex-1"
      style={tw.style({ backgroundColor: canvasColor })}
    >
      <SafeAreaView edges={['top']} style={tw.style('flex-1')}>
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('flex-1')}
          extraScrollHeight={Platform.OS === 'android' ? 50 : 0}
          enableOnAndroid
          enableResetScrollToCoords={false}
        >
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="flex-1 py-4"
          >
            <Box
              testID={containerTestID}
              justifyContent={BoxJustifyContent.Between}
              alignItems={BoxAlignItems.Center}
              twClassName="flex-1 w-full px-5"
            >
              <OnboardingAnimation
                startOnboardingAnimation
                setStartFoxAnimation={setStartFoxAnimation}
                renderWordmark={renderWordmark}
              >
                {children}
              </OnboardingAnimation>
            </Box>
          </Box>
        </KeyboardAwareScrollView>
        <FadeOutOverlay />
        {showScreenshotDeterrent ? (
          <ScreenshotDeterrent enabled isSRP={false} />
        ) : null}
      </SafeAreaView>

      {!hasTestOverrides && (
        <FoxAnimation
          hasFooter={false}
          trigger={startFoxAnimation}
          fullBleedBottom
        />
      )}
    </Box>
  );
};

export default OnboardingLoginCanvas;
