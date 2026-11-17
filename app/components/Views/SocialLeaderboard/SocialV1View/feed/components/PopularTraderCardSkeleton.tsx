import { Card } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { View } from 'react-native';
import { POPULAR_TRADER_CARD_SURFACE } from './PopularTraderCard';
import { PopularTradersCarouselSelectorsIDs } from './PopularTradersCarousel.testIds';
import { SocialFeedSkeletonPlaceholder } from '../../../../../UI/SocialFeed/components/SocialFeedSkeletonPlaceholder';

/**
 * Loading placeholder matching {@link PopularTraderCard}'s vertical footprint.
 */
const PopularTraderCardSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <Card
      twClassName={POPULAR_TRADER_CARD_SURFACE}
      testID={PopularTradersCarouselSelectorsIDs.SKELETON}
    >
      <SocialFeedSkeletonPlaceholder>
        <View style={tw.style('items-center gap-3')}>
          <View style={tw.style('w-10 h-10 rounded-full')} />
          <View style={tw.style('items-center gap-1 w-full')}>
            <View style={tw.style('w-16 h-6 rounded')} />
            <View style={tw.style('w-24 h-5 rounded')} />
          </View>
          <View style={tw.style('w-full h-10 rounded-full')} />
        </View>
      </SocialFeedSkeletonPlaceholder>
    </Card>
  );
};

export default PopularTraderCardSkeleton;
