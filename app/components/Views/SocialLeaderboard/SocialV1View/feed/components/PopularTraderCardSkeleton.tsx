import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { View } from 'react-native';
import { POPULAR_TRADER_CARD_WIDTH } from './PopularTraderCard';
import { PopularTradersCarouselSelectorsIDs } from './PopularTradersCarousel.testIds';
import { SocialFeedSkeletonPlaceholder } from './SocialFeedSkeletonPlaceholder';

/**
 * Loading placeholder matching {@link PopularTraderCard}'s vertical footprint.
 */
const PopularTraderCardSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <View
      style={tw.style(
        `w-[${POPULAR_TRADER_CARD_WIDTH}px] rounded-xl bg-muted p-4`,
      )}
      testID={PopularTradersCarouselSelectorsIDs.SKELETON}
    >
      <SocialFeedSkeletonPlaceholder>
        <View style={tw.style('items-center gap-3')}>
          <View style={tw.style('w-12 h-12 rounded-full')} />
          <View style={tw.style('items-center gap-1 w-full')}>
            <View style={tw.style('w-20 h-5 rounded')} />
            <View style={tw.style('w-24 h-4 rounded')} />
          </View>
          <View style={tw.style('w-full h-8 rounded-lg')} />
        </View>
      </SocialFeedSkeletonPlaceholder>
    </View>
  );
};

export default PopularTraderCardSkeleton;
