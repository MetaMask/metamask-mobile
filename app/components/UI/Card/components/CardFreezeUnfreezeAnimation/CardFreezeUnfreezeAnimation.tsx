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

/**
 * How much wider the RiveView box is vs the static card, to compensate for
 * the artboard's padding around the card (the ice effects need room to
 * overflow outside the card boundary). Tuned on the simulator; adjust if
 * the card renders at the wrong size.
 */
const ARTBOARD_TO_CARD_SCALE = 3;

const styles = StyleSheet.create({
  hidden: {
    opacity: 0,
  },
  overflowVisible: {
    overflow: 'visible',
  },
});

export interface CardFreezeUnfreezeAnimationProps {
  /** Whether the card is currently frozen (drives which trigger fires). */
  isFrozen: boolean;
  /** Static art shown while the Rive view loads, on error, or under Reduce Motion. */
  fallbackSource: ImageSourcePropType;
  /** The static card's rendered width (the animation matches this size). */
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
 *
 * The trigger fires lazily: the desired state is queued until the view model
 * instance and its trigger property are both available, so a freeze that
 * happens at mount is not dropped by the async view model load.
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

  // -- Trigger firing -------------------------------------------------------
  // The desired state (freeze vs unfreeze) is queued in a ref. The trigger
  // fires when the view model instance AND its trigger property are both
  // available — not at mount, which races the async view model load.

  const hasFiredRef = useRef(false);
  const isFrozenRef = useRef(isFrozen);
  isFrozenRef.current = isFrozen;

  const { trigger: fireFreezeTrigger, error: freezeTriggerError } =
    useRiveTrigger(FREEZE_TRIGGER_PATH, viewModelInstance);
  const { trigger: fireUnfreezeTrigger, error: unfreezeTriggerError } =
    useRiveTrigger(UNFREEZE_TRIGGER_PATH, viewModelInstance);

  const fireFreezeRef = useRef(fireFreezeTrigger);
  fireFreezeRef.current = fireFreezeTrigger;
  const fireUnfreezeRef = useRef(fireUnfreezeTrigger);
  fireUnfreezeRef.current = fireUnfreezeTrigger;

  // Fire the queued trigger once the view model instance resolves and the
  // trigger property is available (the hooks report an error when the
  // property is not found — a non-null error means the property isn't ready).
  const canFire =
    Boolean(viewModelInstance) &&
    freezeTriggerError === null &&
    unfreezeTriggerError === null;

  useEffect(() => {
    if (!canFire) {
      return;
    }
    // The initial resolution fires the matching trigger so an
    // already-frozen card shows its frozen pose.
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
  }, [canFire, isFrozen]);

  // -- Size -----------------------------------------------------------------
  // The artboard (1192×754) has padding around the card for the ice effects.
  // The RiveView box is scaled up so the card inside matches the static
  // card's rendered size; the ice effects overflow via the parent's
  // overflow: visible.
  const aspectRatio = 1192 / 754;
  const riveViewWidth = width * ARTBOARD_TO_CARD_SCALE;
  const riveViewHeight = riveViewWidth / aspectRatio;
  const overflowX = (riveViewWidth - width) / 2;

  return (
    <Box style={styles.overflowVisible} testID={testID}>
      {!isRiveReady && (
        <Image
          source={fallbackSource}
          style={[{ width, height: width / (851 / 540) }]}
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
          dataBind={viewModelInstance}
          style={[
            {
              width: riveViewWidth,
              height: riveViewHeight,
              marginLeft: -overflowX,
            },
            !isRiveReady && styles.hidden,
          ]}
          onError={handleError}
        />
      )}
    </Box>
  );
};

export default CardFreezeUnfreezeAnimation;
