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
  const hasTriggeredAnimation = useRef(false);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const [riveError, setRiveError] = useState(false);

  // Fire the confetti animation when the card transitions to full visibility (becomes current)
  useEffect(() => {
    // Use animated value listener to detect when opacity reaches ~1 (fully visible)
    const listenerId = emptyStateOpacity.addListener(({ value }) => {
      // Trigger animation when opacity is close to 1 (card is fully visible/current)
      if (
        value >= OPACITY_TRIGGER_THRESHOLD &&
        !hasTriggeredAnimation.current
      ) {
        // Clear any existing timeout before creating a new one
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
        }

        timeoutIdRef.current = setTimeout(() => {
          if (riveRef.current && !hasTriggeredAnimation.current) {
            try {
              // Fire the Confetti state machine with "Start" trigger
              riveRef.current.fireState('Confetti', 'Start');
              hasTriggeredAnimation.current = true;
            } catch (error) {
              console.warn('Error triggering Rive confetti animation:', error);
            }
          }
          timeoutIdRef.current = null;
        }, CONFETTI_TRIGGER_DELAY);
      }
    });

    return () => {
      emptyStateOpacity.removeListener(listenerId);
      // Clear any pending timeout when the effect cleanup runs
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };
  }, [emptyStateOpacity]);

  // Auto-dismiss empty card after 2000ms when rendered
  useEffect(() => {
    if (onTransitionToEmpty) {
      const timer = setTimeout(() => {
        onTransitionToEmpty();
      }, ANIMATION_TIMINGS.EMPTY_STATE_IDLE_TIME);

      return () => clearTimeout(timer);
    }
  }, [onTransitionToEmpty]);

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
