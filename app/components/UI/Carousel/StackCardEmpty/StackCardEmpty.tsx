import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions } from 'react-native';
import Rive, { Alignment, Fit, RiveRef } from 'rive-react-native';
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
// This delay ensures the Rive component has fully loaded and is ready to fire animations
const CONFETTI_TRIGGER_DELAY = 50;

export const StackCardEmpty: React.FC<StackCardEmptyProps> = ({
  emptyStateOpacity,
  emptyStateScale,
  emptyStateTranslateY,
  nextCardBgOpacity,
  onTransitionToEmpty,
}) => {
  const tw = useTailwind();
  const riveRef = useRef<RiveRef>(null);
  const [riveError, setRiveError] = useState(false);

  // Keep the latest callback in a ref so the parent re-rendering (which passes
  // a new inline arrow each time) doesn't tear down the timers below.
  const onTransitionToEmptyRef = useRef(onTransitionToEmpty);
  onTransitionToEmptyRef.current = onTransitionToEmpty;

  // Fire confetti and start the idle-dismiss timer once the card is fully visible.
  useEffect(() => {
    let listenerId: string | null = null;
    let confettiTimer: NodeJS.Timeout | null = null;
    let dismissTimer: NodeJS.Timeout | null = null;

    const onVisible = () => {
      if (listenerId !== null) {
        emptyStateOpacity.removeListener(listenerId);
        listenerId = null;
      }

      confettiTimer = setTimeout(() => {
        try {
          riveRef.current?.fireState('Confetti', 'Start');
        } catch (error) {
          console.warn('Error triggering Rive confetti animation:', error);
        }
      }, CONFETTI_TRIGGER_DELAY);

      dismissTimer = setTimeout(
        () => onTransitionToEmptyRef.current?.(),
        CONFETTI_TRIGGER_DELAY + ANIMATION_TIMINGS.EMPTY_STATE_IDLE_TIME,
      );
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
      if (confettiTimer) clearTimeout(confettiTimer);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [emptyStateOpacity]);

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
        {!riveError && (
          <Box
            style={tw.style('absolute inset-0 rounded-xl overflow-hidden', {
              height: BANNER_HEIGHT,
              width: BANNER_WIDTH,
            })}
          >
            <Rive
              ref={riveRef}
              source={CarouselConfetti}
              artboardName="Artboard"
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
