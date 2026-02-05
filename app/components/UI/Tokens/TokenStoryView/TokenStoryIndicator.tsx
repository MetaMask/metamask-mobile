import React, { useMemo } from 'react';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { TokenStoryIndicatorProps } from './TokenStoryView.types';

const INDICATOR_SIZE = 8;
const INDICATOR_SIZE_ACTIVE = 10;
const INDICATOR_GAP = 6;

/**
 * Vertical indicator component for the token story view.
 * Shows dots representing each token page with the current position highlighted.
 */
const TokenStoryIndicator = ({
  currentIndex,
  totalCount,
  maxIndicators = 5,
}: TokenStoryIndicatorProps) => {
  const tw = useTailwind();

  // Calculate which indicators to show when there are many tokens
  const visibleRange = useMemo(() => {
    if (totalCount <= maxIndicators) {
      return { start: 0, end: totalCount - 1 };
    }

    const halfMax = Math.floor(maxIndicators / 2);
    let start = currentIndex - halfMax;
    let end = currentIndex + halfMax;

    if (start < 0) {
      start = 0;
      end = maxIndicators - 1;
    } else if (end >= totalCount) {
      end = totalCount - 1;
      start = totalCount - maxIndicators;
    }

    return { start, end };
  }, [currentIndex, totalCount, maxIndicators]);

  const indicators = useMemo(() => {
    const items = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      items.push(i);
    }
    return items;
  }, [visibleRange]);

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="absolute right-4 top-1/2 -translate-y-1/2 z-10"
    >
      {/* Show "more above" indicator */}
      {visibleRange.start > 0 && (
        <Box twClassName="mb-1 opacity-40">
          <Animated.View style={tw.style('w-1 h-1 rounded-full bg-icon-muted')} />
        </Box>
      )}

      {indicators.map((index) => (
        <IndicatorDot
          key={index}
          index={index}
          currentIndex={currentIndex}
        />
      ))}

      {/* Show "more below" indicator */}
      {visibleRange.end < totalCount - 1 && (
        <Box twClassName="mt-1 opacity-40">
          <Animated.View style={tw.style('w-1 h-1 rounded-full bg-icon-muted')} />
        </Box>
      )}
    </Box>
  );
};

interface IndicatorDotProps {
  index: number;
  currentIndex: number;
}

const IndicatorDot = ({ index, currentIndex }: IndicatorDotProps) => {
  const tw = useTailwind();
  const isActive = index === currentIndex;

  const animatedStyle = useAnimatedStyle(() => {
    const size = withSpring(isActive ? INDICATOR_SIZE_ACTIVE : INDICATOR_SIZE, {
      damping: 15,
      stiffness: 200,
    });

    const opacity = withSpring(
      interpolate(
        Math.abs(index - currentIndex),
        [0, 1, 2, 3],
        [1, 0.7, 0.4, 0.2],
      ),
      { damping: 15, stiffness: 200 },
    );

    return {
      width: size,
      height: size,
      opacity,
      marginVertical: INDICATOR_GAP / 2,
    };
  }, [isActive, index, currentIndex]);

  return (
    <Animated.View
      style={[
        tw.style('rounded-full', isActive ? 'bg-primary-default' : 'bg-icon-muted'),
        animatedStyle,
      ]}
    />
  );
};

export default TokenStoryIndicator;
