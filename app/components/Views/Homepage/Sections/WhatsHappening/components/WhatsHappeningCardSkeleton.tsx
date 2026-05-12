import React from 'react';
import { View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  WhatsHappeningSkeletonLineStack,
  WhatsHappeningSkeletonShimmer,
} from './whatsHappeningSkeletonShared';

const WhatsHappeningCardSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <View
      style={tw.style(
        'w-[280px] rounded-2xl bg-background-muted overflow-hidden',
      )}
    >
      <WhatsHappeningSkeletonShimmer>
        <View style={tw.style('p-4 gap-3')}>
          {/* Category badge */}
          <View style={tw.style('w-[80px] h-5 rounded-full')} />
          {/* Title */}
          <WhatsHappeningSkeletonLineStack
            tw={tw}
            gapClass="gap-1"
            lineClassNames={['w-full h-5 rounded', 'w-[85%] h-5 rounded']}
          />
          {/* Description */}
          <WhatsHappeningSkeletonLineStack
            tw={tw}
            gapClass="gap-1"
            lineClassNames={['w-full h-4 rounded', 'w-[75%] h-4 rounded']}
          />
          {/* Asset pills + date */}
          <View style={tw.style('gap-2')}>
            <View style={tw.style('flex-row gap-1')}>
              <View style={tw.style('w-[40px] h-5 rounded-full')} />
              <View style={tw.style('w-[40px] h-5 rounded-full')} />
            </View>
            <View style={tw.style('w-[60px] h-3 rounded')} />
          </View>
        </View>
      </WhatsHappeningSkeletonShimmer>
    </View>
  );
};

export default WhatsHappeningCardSkeleton;
