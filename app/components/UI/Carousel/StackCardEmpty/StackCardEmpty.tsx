import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions } from 'react-native';
import {
  Alignment,
  Fit,
  RiveView,
  useRive,
  useRiveFile,
} from '@rive-app/react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { ANIMATION_TIMINGS } from '../animations/animationTimings';
import { StackCardEmptyProps } from './StackCardEmpty.types';
import { strings } from '../../../../../locales/i18n';
import CarouselConfetti from '../../../../animations/Carousel_Confetti.riv';

const BANNER_HEIGHT = 100;
const SCREEN_WIDTH = Dimensions.get('window').width;
const BANNER_WIDTH = SCREEN_WIDTH - 32;

// Opacity threshold at which to trigger the confetti animation
// Set to 0.95 instead of 1.0 to account for animation rounding and ensure
// the animation fires reliably as the card reaches full visibility
const OPACITY_TRIGGER_THRESHOLD = 0.95;

// Delay before triggering the confetti animation after opacity reaches threshold
// Kept for visual pacing; readiness itself is guaranteed by gating on riveViewRef
const CONFETTI_TRIGGER_DELAY = 50;

export const StackCardEmpty: React.FC<StackCardEmptyProps> = ({
  emptyStateOpacity,
  emptyStateScale,
  emptyStateTranslateY,
  nextCardBgOpacity,
  onTransitionToEmpty,
}) => {
  const tw = useTailwind();
  const { riveFile } = useRiveFile(CarouselConfetti);
  // riveViewRef (state) is non-null only after the native view resolves
  // awaitViewReady — gating the confetti effect on it retries a late-ready
  // view instead of silently skipping the animation.
  const { riveViewRef, setHybridRef } = useRive();
  const [riveError, setRiveError] = useState(false);
  const [isCardVisible, setIsCardVisible] = useState(false);
  const confettiFiredRef = useRef(false);

  // Keep the latest callback in a ref so the parent re-rendering (which passes
  // a new inline arrow each time) doesn't tear down the timers below.
  const onTransitionToEmptyRef = useRef(onTransitionToEmpty);

  useEffect(() => {
    onTransitionToEmptyRef.current = onTransitionToEmpty;
  }, [onTransitionToEmpty]);

  // Mark the card visible once opacity crosses the threshold.
  useEffect(() => {
    let listenerId: string | null = null;

    const onVisible = () => {
      if (listenerId !== null) {
        emptyStateOpacity.removeListener(listenerId);
        listenerId = null;
      }
      setIsCardVisible(true);
    };

    listenerId = emptyStateOpacity.addListener(({ value }) => {
      if (value >= OPACITY_TRIGGER_THRESHOLD) onVisible();
    });

    // addListener doesn't fire with the current value; handle the case where
    // the card mounts already at full opacity.
    const initialValue = (
      emptyStateOpacity as Animated.Value & { __getValue?: () => number }
    ).__getValue?.();
    if (
      typeof initialValue === 'number' &&
      initialValue >= OPACITY_TRIGGER_THRESHOLD
    ) {
      onVisible();
    }

    return () => {
      if (listenerId !== null) emptyStateOpacity.removeListener(listenerId);
    };
  }, [emptyStateOpacity]);

  // Start the idle-dismiss timer once visible — independent of Rive readiness,
  // so dismiss still proceeds even if the animation never loads.
  useEffect(() => {
    if (!isCardVisible) return undefined;
    const dismissTimer = setTimeout(
      () => onTransitionToEmptyRef.current?.(),
      CONFETTI_TRIGGER_DELAY + ANIMATION_TIMINGS.EMPTY_STATE_IDLE_TIME,
    );
    return () => clearTimeout(dismissTimer);
  }, [isCardVisible]);

  // Fire confetti exactly once, when the card is visible AND the Rive view is
  // ready. If the view readies late, the riveViewRef state flip re-runs this
  // effect and the trigger retries instead of being dropped.
  useEffect(() => {
    if (!isCardVisible || !riveViewRef || confettiFiredRef.current)
      return undefined;
    const confettiTimer = setTimeout(() => {
      confettiFiredRef.current = true;
      try {
        riveViewRef.triggerInput('Start');
      } catch (error) {
        console.warn('Error triggering Rive confetti animation:', error);
      }
    }, CONFETTI_TRIGGER_DELAY);
    return () => clearTimeout(confettiTimer);
  }, [isCardVisible, riveViewRef]);

  return (
    <Animated.View
      style={tw.style('absolute', {
        opacity: emptyStateOpacity,
        transform: [
          { scale: emptyStateScale },
          { translateY: emptyStateTranslateY },
        ],
        zIndex: 2,
      })}
    >
      <Box
        style={tw.style(
          'rounded-xl relative overflow-hidden border border-muted bg-default',
          {
            height: BANNER_HEIGHT,
            width: BANNER_WIDTH,
          },
        )}
      >
        {/* Confetti animation background layer */}
        {!riveError && riveFile && (
          <Box
            style={tw.style('absolute inset-0 rounded-xl overflow-hidden', {
              height: BANNER_HEIGHT,
              width: BANNER_WIDTH,
            })}
          >
            <RiveView
              hybridRef={setHybridRef}
              file={riveFile}
              artboardName="Artboard"
              stateMachineName="Confetti"
              fit={Fit.Cover}
              alignment={Alignment.Center}
              style={{
                width: BANNER_WIDTH,
                height: BANNER_HEIGHT,
              }}
              onError={(error) => {
                console.warn('Rive animation failed to load:', error);
                setRiveError(true);
              }}
            />
          </Box>
        )}

        {/* Animated pressed background overlay */}
        <Animated.View
          style={tw.style('absolute inset-0 bg-default-pressed rounded-xl', {
            opacity: nextCardBgOpacity,
          })}
        />

        {/* Text content layer on top */}
        <Box twClassName="w-full h-full flex justify-center items-center relative z-10">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            testID="carousel-empty-state"
          >
            {strings('wallet.carousel.empty_state')}
          </Text>
        </Box>
      </Box>
    </Animated.View>
  );
};

export default StackCardEmpty;
