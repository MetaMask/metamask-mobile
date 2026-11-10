import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alignment,
  Fit,
  RiveView,
  useRive,
  useRiveFile,
  type RiveError,
} from '@rive-app/react-native';
import { createProjectLogger } from '@metamask/utils';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import CardVerifiedCheckAnimation from '../../../../../animations/card_verified_check.riv';
import VbaIllustration, {
  VbaIllustrationSource,
} from '../../../KYC/components/Illustration';
import { CompleteSelectors } from './Complete.testIds';

const log = createProjectLogger('card-complete-check-animation');

// -- Rive names ------------------------------------------------------------
// These MUST match the names authored in card_verified_check.riv.
//
// The state machine plays `Intro` on entry and then rests on `Hold`, a static
// pose, on its own. It has no inputs; the file's only View Model trigger,
// `outro`, is never fired, so the tick draws in once and stays.

/** Artboard holding the checkmark (500×500). */
const RIVE_ARTBOARD = 'Check';

/** State machine that runs `Intro` into `Hold` on entry. */
const RIVE_STATE_MACHINE = 'State Machine 1';

// Sizing: the slot is 140×107, the size of the static checkmark artwork it
// replaces. The tick fills about 69% of the square artboard's width, so the
// Rive view is drawn at 204×204 and centred on the slot: the tick then lands
// at the same size and position as the static checkmark.

interface CompleteCheckAnimationProps {
  /**
   * `animate` plays the Rive tick, `static` shows the checkmark artwork, and
   * `pending` keeps the slot empty until the Reduce Motion check resolves.
   */
  mode: 'pending' | 'animate' | 'static';
  /**
   * Called once the file has loaded and the native view is ready, which is
   * when the state machine starts playing `Intro`.
   */
  onEntranceStart?: () => void;
  /** Called when Rive fails and the static checkmark takes over. */
  onRiveError?: () => void;
}

/**
 * Card onboarding success checkmark. Draws the tick in with Rive, falling back
 * to the static VBA checkmark under Reduce Motion or when Rive fails.
 */
const CompleteCheckAnimation = ({
  mode,
  onEntranceStart,
  onRiveError,
}: CompleteCheckAnimationProps) => {
  const tw = useTailwind();
  const [hasRiveError, setHasRiveError] = useState(false);
  const { riveFile, error: riveFileError } = useRiveFile(
    CardVerifiedCheckAnimation,
  );
  const { riveViewRef, setHybridRef } = useRive();
  const hasReportedEntranceStart = useRef(false);
  const shouldAnimate = mode === 'animate' && !hasRiveError;

  const handleError = useCallback(
    (riveError: RiveError) => {
      log(`Rive error: ${riveError.message}`);
      setHasRiveError(true);
      onRiveError?.();
    },
    [onRiveError],
  );

  // A failed file load never reaches `onError` on the view in the Nitro
  // runtime, so report it here or the slot would stay empty.
  useEffect(() => {
    if (!riveFileError || mode !== 'animate') {
      return;
    }
    log(`Rive file failed to load: ${riveFileError.message}`);
    setHasRiveError(true);
    onRiveError?.();
  }, [riveFileError, mode, onRiveError]);

  useEffect(() => {
    if (
      !shouldAnimate ||
      !riveFile ||
      !riveViewRef ||
      hasReportedEntranceStart.current
    ) {
      return;
    }
    hasReportedEntranceStart.current = true;
    onEntranceStart?.();
  }, [shouldAnimate, riveFile, riveViewRef, onEntranceStart]);

  if (mode === 'static' || hasRiveError) {
    return (
      <Box
        twClassName="h-[107px] w-[140px]"
        testID={CompleteSelectors.CHECK_IMAGE}
      >
        <VbaIllustration
          source={VbaIllustrationSource.checkmark}
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
          hybridRef={setHybridRef}
          file={riveFile}
          artboardName={RIVE_ARTBOARD}
          stateMachineName={RIVE_STATE_MACHINE}
          autoPlay
          fit={Fit.Contain}
          alignment={Alignment.Center}
          style={tw.style('h-[204px] w-[204px]')}
          onError={handleError}
          testID={CompleteSelectors.CHECK_ANIMATION}
        />
      ) : null}
    </Box>
  );
};

export default CompleteCheckAnimation;
