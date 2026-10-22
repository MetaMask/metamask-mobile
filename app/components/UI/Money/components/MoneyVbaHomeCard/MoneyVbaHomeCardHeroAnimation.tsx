import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Alignment,
  Fit,
  RiveErrorType,
  RiveView,
  useRive,
  useRiveFile,
  type RiveError,
  type RiveViewRef,
} from '@rive-app/react-native';
import Logger from '../../../../../util/Logger';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import type {
  MoneyVbaHomeCardHeroAnimation as MoneyVbaHomeCardHeroAnimationSpec,
  MoneyVbaHomeCardHeroArt,
} from './MoneyVbaHomeCardConfig';
import { MONEY_VBA_HOME_CARD_HERO_TEST_IDS } from './MoneyVbaHomeCard.testIds';

const styles = StyleSheet.create({
  hidden: {
    opacity: 0,
  },
});

interface MoneyVbaHomeCardHeroAnimationProps {
  /** Rive file and runtime names to play. */
  animation: MoneyVbaHomeCardHeroAnimationSpec;
  /**
   * Static art shown while the Rive view loads, when Reduce Motion is on, and
   * when Rive reports an error. Its size also sizes the animation.
   */
  fallback: MoneyVbaHomeCardHeroArt;
}

/**
 * Decorative Rive hero for a `MoneyVbaHomeCard` variant. The static art stays
 * visible until the native Rive view is ready, so there is no blank or
 * first-frame flash, and it is the only thing rendered when Reduce Motion is
 * on or Rive fails.
 *
 * The animation plays once per visit: autoplay covers the first focus, and
 * every later focus of the host screen (e.g. tabbing back to Money) resets the
 * state machine and plays it again from the start.
 */
const MoneyVbaHomeCardHeroAnimation = ({
  animation,
  fallback,
}: MoneyVbaHomeCardHeroAnimationProps) => {
  const reduceMotion = useReduceMotion();
  const [hasRiveError, setHasRiveError] = useState(false);
  const { riveFile } = useRiveFile(animation.source);
  // Non-null only once the native view resolves awaitViewReady.
  const { riveViewRef, setHybridRef } = useRive();

  const animate = !reduceMotion && !hasRiveError;
  const isRiveReady = animate && Boolean(riveFile) && Boolean(riveViewRef);

  const handleError = useCallback(
    (riveError: RiveError) => {
      Logger.error(new Error(riveError.message), {
        tags: { feature: 'money-home' },
        context: {
          name: 'MoneyVbaHomeCardHeroAnimation',
          data: {
            artboardName: animation.artboardName,
            errorType: RiveErrorType[riveError.type],
          },
        },
      });
      setHasRiveError(true);
    },
    [animation.artboardName],
  );

  // Read through refs so the focus callback stays stable and only runs on
  // real focus events, not when readiness or Reduce Motion resolve.
  const riveViewRefLatest = useRef<RiveViewRef | null>(riveViewRef);
  const animateLatest = useRef(animate);
  const hasFocusedRef = useRef(false);

  useEffect(() => {
    riveViewRefLatest.current = riveViewRef;
    animateLatest.current = animate;
  }, [riveViewRef, animate]);

  const logReplayError = useCallback(
    (error: unknown) => {
      Logger.error(error instanceof Error ? error : new Error(String(error)), {
        tags: { feature: 'money-home' },
        context: {
          name: 'MoneyVbaHomeCardHeroAnimation',
          data: { artboardName: animation.artboardName, action: 'replay' },
        },
      });
    },
    [animation.artboardName],
  );

  useFocusEffect(
    useCallback(() => {
      // Autoplay already covers the first visit.
      if (!hasFocusedRef.current) {
        hasFocusedRef.current = true;
        return;
      }
      const view = riveViewRefLatest.current;
      // Not ready yet: autoplay will start it once it is. Reduce Motion or a
      // Rive error: nothing animates.
      if (!view || !animateLatest.current) return;
      const replay = async () => {
        await view.reset();
        await view.play();
      };
      // The native view can detach (e.g. unmount) mid-replay.
      replay().catch(logReplayError);
    }, [logReplayError]),
  );

  // Nitro's RiveView needs explicit dimensions; it renders blank with
  // absoluteFill inside this small box.
  const size = { width: fallback.width, height: fallback.height };

  return (
    <Box style={size}>
      {!isRiveReady && (
        <Image
          source={fallback.source}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          accessible={false}
          testID={MONEY_VBA_HOME_CARD_HERO_TEST_IDS.FALLBACK}
        />
      )}
      {animate && riveFile && (
        <RiveView
          hybridRef={setHybridRef}
          file={riveFile}
          artboardName={animation.artboardName}
          stateMachineName={animation.stateMachineName}
          autoPlay
          fit={Fit.Contain}
          alignment={Alignment.Center}
          style={[size, !isRiveReady && styles.hidden]}
          onError={handleError}
          testID={MONEY_VBA_HOME_CARD_HERO_TEST_IDS.RIVE}
        />
      )}
    </Box>
  );
};

export default MoneyVbaHomeCardHeroAnimation;
