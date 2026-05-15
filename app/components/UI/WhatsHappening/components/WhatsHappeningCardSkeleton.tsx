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
            lineClassNames={[
              'w-full h-4 rounded',
              'w-[90%] h-4 rounded',
              'w-[75%] h-4 rounded',
            ]}
          />
          {/* Asset avatar + label (left) and date (right) */}
          <View style={tw.style('flex-row items-center justify-between')}>
            <View style={tw.style('flex-row items-center gap-1')}>
              <View style={tw.style('w-4 h-4 rounded-full')} />
              <View style={tw.style('w-[50px] h-3 rounded')} />
            </View>
            <View style={tw.style('w-[40px] h-3 rounded')} />
          </View>
        </View>
      </WhatsHappeningSkeletonShimmer>
    </View>
  );
};

export default WhatsHappeningCardSkeleton;
