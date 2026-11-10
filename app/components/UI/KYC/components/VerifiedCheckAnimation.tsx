import React, { useCallback, useEffect, useState } from 'react';
import {
  Alignment,
  Fit,
  RiveView,
  useRiveFile,
  type RiveError,
} from '@rive-app/react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Logger from '../../../../util/Logger';
import verifiedCheck from '../../../../animations/card_verified_check.riv';
import KycIllustration, { KycIllustrationSource } from './Illustration';
import type { VerifiedSuccessMode } from '../hooks/useVerifiedSuccessCascade';
import { VerifiedCheckAnimationSelectors } from './VerifiedCheckAnimation.testIds';

/** Runtime names in `card_verified_check.riv`. The machine plays `Intro` once, then holds. */
const RIVE_ARTBOARD = 'Check';
const RIVE_STATE_MACHINE = 'State Machine 1';

interface VerifiedCheckAnimationProps {
  mode: VerifiedSuccessMode;
  /** Called once the tick can play, or when Rive fails and the static checkmark shows. */
  onEntranceStart: () => void;
}

/** Verified success tick. Falls back to the static KYC checkmark. */
const VerifiedCheckAnimation = ({
  mode,
  onEntranceStart,
}: VerifiedCheckAnimationProps) => {
  const tw = useTailwind();
  const { riveFile, error: riveFileError } = useRiveFile(verifiedCheck);
  const [hasViewError, setHasViewError] = useState(false);
  const hasRiveError = Boolean(riveFileError) || hasViewError;

  const handleError = useCallback((riveError: RiveError) => {
    Logger.error(
      new Error(riveError.message),
      `VerifiedCheckAnimation: Rive error (${riveError.type})`,
    );
    setHasViewError(true);
  }, []);

  useEffect(() => {
    if (mode === 'animate' && (riveFile || hasRiveError)) {
      onEntranceStart();
    }
  }, [hasRiveError, mode, onEntranceStart, riveFile]);

  if (mode === 'static' || hasRiveError) {
    return (
      <Box testID={VerifiedCheckAnimationSelectors.CHECK_IMAGE}>
        <KycIllustration
          source={KycIllustrationSource.checkmark}
          twClassName="h-[107px] w-[140px]"
        />
      </Box>
    );
  }

  return (
    <Box
      twClassName="h-[107px] w-[140px] items-center justify-center"
      pointerEvents="none"
    >
      {mode === 'animate' && riveFile ? (
        <RiveView
          file={riveFile}
          artboardName={RIVE_ARTBOARD}
          stateMachineName={RIVE_STATE_MACHINE}
          autoPlay
          fit={Fit.Contain}
          alignment={Alignment.Center}
          // The tick fills ~69% of the artboard, so 204px matches the static checkmark.
          style={tw.style('h-[204px] w-[204px]')}
          onError={handleError}
          testID={VerifiedCheckAnimationSelectors.CHECK_ANIMATION}
        />
      ) : null}
    </Box>
  );
};

export default VerifiedCheckAnimation;
