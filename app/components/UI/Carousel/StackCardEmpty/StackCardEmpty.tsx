import React, { useEffect, useRef } from 'react';
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

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
const CarouselConfetti = require('../../../../animations/Carousel_Confetti.riv');

const BANNER_HEIGHT = 100;
const SCREEN_WIDTH = Dimensions.get('window').width;
const BANNER_WIDTH = SCREEN_WIDTH - 32;

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

  // Fire the confetti animation when the card transitions to full visibility (becomes current)
  useEffect(() => {
    // Use animated value listener to detect when opacity reaches ~1 (fully visible)
    const listenerId = emptyStateOpacity.addListener(({ value }) => {
      // Trigger animation when opacity is close to 1 (card is fully visible/current)
      if (value >= 0.95 && !hasTriggeredAnimation.current) {
        const timeoutId = setTimeout(() => {
          if (riveRef.current && !hasTriggeredAnimation.current) {
            try {
              // Fire the Confetti state machine with "Start" trigger
              riveRef.current.fireState('Confetti', 'Start');
              hasTriggeredAnimation.current = true;
            } catch (error) {
              console.warn('Error triggering Rive confetti animation:', error);
            }
          }
        }, 50);

        return () => clearTimeout(timeoutId);
      }
    });

    return () => {
      emptyStateOpacity.removeListener(listenerId);
    };
  }, [emptyStateOpacity]);

  // Auto-dismiss empty card after 1000ms when rendered
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
          />
        </Box>

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
