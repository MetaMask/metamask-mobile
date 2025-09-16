import React from 'react';
import { Animated, Dimensions } from 'react-native';
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

  // Auto-dismiss empty card after 1000ms when rendered
  React.useEffect(() => {
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
        zIndex: 2, // Same as next card
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
        {/* Animated pressed background overlay */}
        <Animated.View
          style={tw.style('absolute inset-0 bg-default-pressed rounded-xl', {
            opacity: nextCardBgOpacity,
          })}
        />
        <Box twClassName="w-full h-full flex justify-center items-center">
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
