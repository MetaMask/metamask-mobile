import React from 'react';
import { Dimensions, ScrollView } from 'react-native';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import { PredictHomeFeaturedVariant } from '../../selectors/featureFlags';
import PredictHomeSkeleton from './PredictHomeSkeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.8;
const CARD_HEIGHT = 220;

interface PredictHomeFeaturedSkeletonProps {
  variant: PredictHomeFeaturedVariant;
  testID?: string;
}

const CarouselSkeleton: React.FC<{ testID: string }> = ({ testID }) => {
  const tw = useTailwind();

  return (
    <Box testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
      >
        {[0, 1].map((index) => (
          <Box
            key={`skeleton-${index}`}
            twClassName="bg-background-alternative rounded-xl p-3 mr-4"
            style={tw.style({ width: CARD_WIDTH, height: CARD_HEIGHT })}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              twClassName="items-center gap-3 mb-3"
            >
              <Skeleton
                width={40}
                height={40}
                style={tw.style('rounded-full')}
              />
              <Box twClassName="flex-1">
                <Skeleton
                  width="100%"
                  height={18}
                  style={tw.style('rounded-md')}
                />
              </Box>
            </Box>
            <Skeleton
              width="100%"
              height={120}
              style={tw.style('rounded-xl mb-3')}
            />
            <Skeleton width="75%" height={32} style={tw.style('rounded-md')} />
          </Box>
        ))}
      </ScrollView>
    </Box>
  );
};

const PredictHomeFeaturedSkeleton: React.FC<
  PredictHomeFeaturedSkeletonProps
> = ({ variant, testID = 'predict-home-featured-skeleton' }) => {
  const tw = useTailwind();

  return (
    <Box testID={testID}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="items-center mb-2 gap-1"
      >
        <Skeleton width={80} height={24} style={tw.style('rounded-md')} />
        <Skeleton width={16} height={16} style={tw.style('rounded-full')} />
      </Box>
      {variant === 'list' ? (
        <PredictHomeSkeleton testID={`${testID}-list`} />
      ) : (
        <CarouselSkeleton testID={`${testID}-carousel`} />
      )}
    </Box>
  );
};

export default PredictHomeFeaturedSkeleton;
