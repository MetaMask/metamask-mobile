import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
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
 * The artboard's native dimensions in the .riv file. The RiveView renders
 * 1:1 at this size (Fit.None) — no stretching, no clipping, no scaling.
 */
const ARTBOARD_WIDTH = 1192;
const ARTBOARD_HEIGHT = 754;

const styles = StyleSheet.create({
  hidden: {
    opacity: 0,
  },
  overflowVisible: {
    overflow: 'visible',
  },
  /** Centres a child within the parent's bounds. */
  centre: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Blocks all touches so the tiles below stay tappable. */
  noPointer: {
    pointerEvents: 'none',
  },
});

export interface CardFreezeUnfreezeAnimationProps {
  /** Whether the card is currently frozen (drives which trigger fires). */
  isFrozen: boolean;
  /** Static art shown while the Rive view loads, on error, or under Reduce Motion. */
  fallbackSource: ImageSourcePropType;
  /** The static card's rendered width (the fallback matches this size). */
  width: number;
  testID?: string;
}

/**
 * Rive freeze/unfreeze animation for the Card home card art. Plays the
 * `freeze` trigger when the card is frozen and `unfreeze` when it is
 * unfrozen, via the "Card" view model's trigger properties.
 *
 * The RiveView renders at the artboard's native dimensions (1192×754,
 * Fit.None, 1:1 in points) centred on the card art's position — no
 * stretching, no clipping, no scaling. `pointerEvents="none"` on the
 * overlay lets touches pass through to the tiles below.
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

  const canFire =
    Boolean(viewModelInstance) &&
    freezeTriggerError === null &&
    unfreezeTriggerError === null;

  useEffect(() => {
    if (!canFire) {
      return;
    }
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

  // -- Layout ---------------------------------------------------------------
  // The static card's dimensions (for the fallback image).
  const cardHeight = width / (851 / 540);

  return (
    <Box
      style={[{ width, height: cardHeight }, styles.overflowVisible]}
      testID={testID}
    >
      {!isRiveReady && (
        <Image
          source={fallbackSource}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          accessible={false}
        />
      )}
      {animate && riveFile && (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.centre,
            styles.noPointer,
            {
              width: ARTBOARD_WIDTH,
              height: ARTBOARD_HEIGHT,
              left: (width - ARTBOARD_WIDTH) / 2,
              top: (cardHeight - ARTBOARD_HEIGHT) / 2,
            },
          ]}
          pointerEvents="none"
        >
          <RiveView
            style={{ width: ARTBOARD_WIDTH, height: ARTBOARD_HEIGHT }}
            hybridRef={setHybridRef}
            file={riveFile}
            artboardName={ARTBOARD_NAME}
            stateMachineName={STATE_MACHINE_NAME}
            autoPlay
            fit={Fit.None}
            alignment={Alignment.Center}
            dataBind={viewModelInstance ?? undefined}
            onError={handleError}
          />
        </View>
      )}
    </Box>
  );
};

export default CardFreezeUnfreezeAnimation;
