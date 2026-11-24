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
import cardFrontFullRes from '../../../../../images/card_freeze_card_front.png';

/** Runtime-facing names; MUST match the names authored in the .riv file. */
const ARTBOARD_NAME = 'Card Freeze/Unfreeze';
const STATE_MACHINE_NAME = 'CardStateMachine';
const VIEW_MODEL_NAME = 'Card';
const FREEZE_TRIGGER_PATH = 'freeze';
const UNFREEZE_TRIGGER_PATH = 'unfreeze';

/** Out-of-band asset the .riv file references for the card face art. */
const CARD_FRONT_ASSET_NAME = 'DigitalCard-NewBrand';

/**
 * The artboard's native dimensions in the .riv file (the file itself is
 * never modified). The RiveView is scaled so the artboard's 851-wide card
 * face spans the static card's width (Fit.Contain) — see the layout below.
 */
const ARTBOARD_WIDTH = 1192;
/** The card's size inside the artboard (centred, measured from the file). */
const CARD_IN_ARTBOARD_WIDTH = 851;
const ARTBOARD_HEIGHT = 754;

const styles = StyleSheet.create({
  hidden: {
    opacity: 0,
  },
  absolute: {
    position: 'absolute',
  },
  overflowVisible: {
    overflow: 'visible',
  },
  /** Centres a child within the parent's bounds. */
  centre: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frozenFallback: {
    opacity: 0.5,
  },
  /** Blocks all touches so the tiles below stay tappable. */
  noPointer: {
    pointerEvents: 'none',
  },
});

// Stable across renders: Nitro installs the asset loader when the file loads,
// so a new options object would reload the ~4.4 MB file.
const RIVE_FILE_OPTIONS = {
  referencedAssets: {
    [CARD_FRONT_ASSET_NAME]: { source: cardFrontFullRes as number },
  },
};

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
 * The RiveView scales the whole artboard (1192×754, the .riv file is
 * untouched) so its 851-wide card face spans the card art's width — the
 * view is rendered at width × 1192/851 with Fit.Contain, centred on the
 * card art's position. `pointerEvents="none"` on the overlay lets touches
 * pass through to the tiles below.
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
  const { riveFile } = useRiveFile(cardFreezeUnfreezeRiv, RIVE_FILE_OPTIONS);
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

  const riveViewRefRef = useRef(riveViewRef);
  riveViewRefRef.current = riveViewRef;
  const fireFreezeRef = useRef(fireFreezeTrigger);
  fireFreezeRef.current = fireFreezeTrigger;
  const fireUnfreezeRef = useRef(fireUnfreezeTrigger);
  fireUnfreezeRef.current = fireUnfreezeTrigger;

  // riveViewRef is set only once the native view is ready to play.
  const canFire =
    Boolean(riveViewRef) &&
    Boolean(viewModelInstance) &&
    freezeTriggerError === null &&
    unfreezeTriggerError === null;

  useEffect(() => {
    if (!canFire) {
      // A view or view model that comes back starts from the unfrozen state,
      // so treat it as a fresh mount: re-apply a freeze, never replay a melt.
      hasFiredRef.current = false;
      return;
    }
    if (!hasFiredRef.current) {
      hasFiredRef.current = true;
      if (isFrozenRef.current) {
        fireFreezeRef.current?.();
        riveViewRefRef.current?.playIfNeeded();
      }
      return;
    }
    if (isFrozenRef.current) {
      fireFreezeRef.current?.();
    } else {
      fireUnfreezeRef.current?.();
    }
    // Once the freeze settles the state machine stops advancing, so a later
    // trigger isn't drawn until the view is nudged back into playing.
    riveViewRefRef.current?.playIfNeeded();
  }, [canFire, isFrozen]);

  // -- Layout ---------------------------------------------------------------
  // The static card's dimensions (for the fallback image).
  const cardHeight = width / (851 / 540);
  // Size the whole artboard so its card lands exactly on the static card.
  const riveWidth = (width * ARTBOARD_WIDTH) / CARD_IN_ARTBOARD_WIDTH;
  const riveHeight = (riveWidth * ARTBOARD_HEIGHT) / ARTBOARD_WIDTH;
  // Keep the Rive view hidden (static card showing) until the native view
  // says it is ready and has drawn at its final size; its first frames can be
  // drawn before the view is sized, which reads as a brief blow-up.
  const [hasLaidOut, setHasLaidOut] = useState(false);
  useEffect(() => {
    if (!riveViewRef) {
      return;
    }
    let cancelled = false;
    riveViewRef
      .awaitViewReady()
      .then(() => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (!cancelled) {
              setHasLaidOut(true);
            }
          }),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [riveViewRef]);

  return (
    <Box
      style={[{ width, height: cardHeight }, styles.overflowVisible]}
      testID={testID}
    >
      {(!isRiveReady || !hasLaidOut) && (
        <Image
          source={animate ? cardFrontFullRes : fallbackSource}
          // The static art has no ice, so dim a frozen card like CardImage.
          style={[StyleSheet.absoluteFill, isFrozen && styles.frozenFallback]}
          resizeMode="contain"
          accessible={false}
        />
      )}
      {animate && riveFile && (
        <View
          style={[
            styles.absolute,
            styles.noPointer,
            {
              width: riveWidth,
              height: riveHeight,
              left: (width - riveWidth) / 2,
              top: (cardHeight - riveHeight) / 2,
            },
            !hasLaidOut && styles.hidden,
          ]}
          pointerEvents="none"
        >
          <RiveView
            style={{ width: riveWidth, height: riveHeight }}
            hybridRef={setHybridRef}
            file={riveFile}
            artboardName={ARTBOARD_NAME}
            stateMachineName={STATE_MACHINE_NAME}
            autoPlay
            fit={Fit.Contain}
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
