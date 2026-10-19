import React from 'react';
import { View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  WHATS_HAPPENING_CARD_MIN_HEIGHT,
  WHATS_HAPPENING_CARD_WIDTH,
} from '../constants';
import {
  WhatsHappeningSkeletonLineStack,
  WhatsHappeningSkeletonShimmer,
} from './whatsHappeningSkeletonShared';

const WhatsHappeningCardSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <View
      style={tw.style(
        `w-[${WHATS_HAPPENING_CARD_WIDTH}px] min-h-[${WHATS_HAPPENING_CARD_MIN_HEIGHT}px] rounded-2xl bg-muted overflow-hidden pt-4 pl-4 pb-4`,
      )}
    >
      <WhatsHappeningSkeletonShimmer>
        <View style={tw.style('gap-3')}>
          <View style={tw.style('gap-3 pr-4')}>
            <View
              style={tw.style('w-full flex-row items-center justify-between')}
            >
              <View style={tw.style('w-[80px] h-5 rounded-full')} />
              <View style={tw.style('w-[40px] h-3 rounded')} />
            </View>
            <WhatsHappeningSkeletonLineStack
              tw={tw}
              gapClass="gap-1"
              lineClassNames={['w-full h-5 rounded', 'w-[85%] h-5 rounded']}
            />
            <WhatsHappeningSkeletonLineStack
              tw={tw}
              gapClass="gap-1"
              lineClassNames={[
                'w-full h-4 rounded',
                'w-[90%] h-4 rounded',
                'w-[75%] h-4 rounded',
              ]}
            />
          </View>
          <View style={tw.style('flex-row gap-2')}>
            <View style={tw.style('h-7 w-[52px] rounded-full')} />
            <View style={tw.style('h-7 w-[48px] rounded-full')} />
            <View style={tw.style('h-7 w-[56px] rounded-full')} />
            <View style={tw.style('h-7 w-[44px] rounded-full')} />
          </View>
        </View>
      </WhatsHappeningSkeletonShimmer>
    </View>
  );
};

export default WhatsHappeningCardSkeleton;
