import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import {
  Alignment,
  Fit,
  RiveErrorType,
  RiveView,
  useRive,
  useRiveFile,
  useRiveTrigger,
  useViewModelInstance,
  type RiveError,
  type RiveViewRef,
} from '@rive-app/react-native';
import Logger from '../../../../../util/Logger';
import { useReduceMotion } from '../../../Money/hooks/useReduceMotion';
import cardFreezeUnfreezeRiv from '../../../../../animations/card_freeze_unfreeze.riv';
import cardArtFallback from '../../../../../images/mm_card_regular.png';

/** Runtime-facing names; MUST match the names authored in the .riv file. */
const ARTBOARD_NAME = 'Card Freeze/Unfreeze';
const STATE_MACHINE_NAME = 'CardStateMachine';
const VIEW_MODEL_NAME = 'Card';
const FREEZE_TRIGGER_PATH = 'freeze';
const UNFREEZE_TRIGGER_PATH = 'unfreeze';

/** Out-of-band asset the .riv file references for the card face art. */
const CARD_FRONT_ASSET_NAME = 'DigitalCard-NewBrand';

const styles = StyleSheet.create({
  hidden: {
    opacity: 0,
  },
});

export interface CardFreezeUnfreezeAnimationProps {
  /** Whether the card is currently frozen (drives which trigger fires). */
  isFrozen: boolean;
  /** Static art shown while the Rive view loads, on error, or under Reduce Motion. */
  fallbackSource: ImageSourcePropType;
  /** Aspect ratio for sizing (artboard is 1192×754). */
  width: number;
  testID?: string;
}

/**
 * Rive freeze/unfreeze animation for the Card home card art. Plays the
 * `freeze` trigger when the card is frozen and `unfreeze` when it is
 * unfrozen, via the "Card" view model's trigger properties.
 *
 * The static card art stays visible until the Rive view is ready, and it is
 * the only thing rendered when Reduce Motion is on or Rive fails.
 *
 * The card face (`cardFront` on the view model) is supplied out-of-band via
 * the referenced-assets mechanism — the .riv file's embedded copy is empty.
 */
const CardFreezeUnfreezeAnimation = ({
  isFrozen,
  fallbackSource,
  width,
  testID,
}: CardFreezeUnfreezeAnimationProps) => {
  const reduceMotion = useReduceMotion();
  const [hasRiveError, setHasRiveError] = useState(false);
  const { riveFile } = useRiveFile(cardFreezeUnfreezeRiv, {
    referencedAssets: {
      [CARD_FRONT_ASSET_NAME]: { source: cardArtFallback as number },
    },
  });
  const { riveViewRef, setHybridRef } = useRive();
  const { instance: viewModelInstance } = useViewModelInstance(riveFile, {
    async: true,
    viewModelName: VIEW_MODEL_NAME,
  });

  const animate = !reduceMotion && !hasRiveError;
  const isRiveReady = animate && Boolean(riveFile) && Boolean(riveViewRef);

  const handleError = useCallback((riveError: RiveError) => {
    Logger.error(new Error(riveError.message), {
      tags: { feature: 'card-home' },
      context: {
        name: 'CardFreezeUnfreezeAnimation',
        data: {
          artboardName: ARTBOARD_NAME,
          errorType: RiveErrorType[riveError.type],
        },
      },
    });
    setHasRiveError(true);
  }, []);

  // Fire the freeze or unfreeze trigger whenever the frozen state changes.
  const hasFiredRef = useRef(false);
  const isFrozenRef = useRef(isFrozen);
  isFrozenRef.current = isFrozen;

  const { trigger: fireFreezeTrigger } = useRiveTrigger(
    FREEZE_TRIGGER_PATH,
    viewModelInstance,
  );
  const { trigger: fireUnfreezeTrigger } = useRiveTrigger(
    UNFREEZE_TRIGGER_PATH,
    viewModelInstance,
  );
  const fireFreezeRef = useRef(fireFreezeTrigger);
  fireFreezeRef.current = fireFreezeTrigger;
  const fireUnfreezeRef = useRef(fireUnfreezeTrigger);
  fireUnfreezeRef.current = fireUnfreezeTrigger;

  useEffect(() => {
    // The initial mount fires the matching trigger so an already-frozen card
    // shows its frozen pose (an accepted replay for the load-time state).
    if (!hasFiredRef.current) {
      hasFiredRef.current = true;
      if (isFrozenRef.current) {
        fireFreezeRef.current?.();
      }
      return;
    }
    if (isFrozenRef.current) {
      fireFreezeRef.current?.();
    } else {
      fireUnfreezeRef.current?.();
    }
  }, [isFrozen]);

  const aspectRatio = 1192 / 754;
  const size = { width, height: width / aspectRatio };

  return (
    <Box style={size} testID={testID}>
      {!isRiveReady && (
        <Image
          source={fallbackSource}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          accessible={false}
        />
      )}
      {animate && riveFile && (
        <RiveView
          hybridRef={setHybridRef}
          file={riveFile}
          artboardName={ARTBOARD_NAME}
          stateMachineName={STATE_MACHINE_NAME}
          autoPlay
          fit={Fit.Contain}
          alignment={Alignment.Center}
          style={[size, !isRiveReady && styles.hidden]}
          onError={handleError}
        />
      )}
    </Box>
  );
};

export default CardFreezeUnfreezeAnimation;
