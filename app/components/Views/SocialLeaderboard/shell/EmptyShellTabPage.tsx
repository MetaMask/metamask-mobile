import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  HotTokensCarousel,
  SocialFeedPositionCard,
} from '../SocialV1View/feed/components';
import { useSocialV1Feed } from '../SocialV1View/feed/hooks/useSocialV1Feed';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';

type AnimatedScrollHandler = React.ComponentProps<
  typeof Animated.ScrollView
>['onScroll'];

export type SocialFeedShellTab = 'trending' | 'following';

export interface EmptyShellTabPageProps {
  tab: SocialFeedShellTab;
  /**
   * The pager mounts every page up front. Hold the mock list back until the
   * tab is first opened so Trending and Following don't duplicate testIDs.
   */
  isActive?: boolean;
  onScroll?: AnimatedScrollHandler;
  pageRef?: React.Ref<SocialTabPageHandle>;
  containerTestID: string;
  scrollTestID: string;
}

/**
 * Social Bundle V1 Trending / Following page: mocked position cards until the
 * API supplies post/comment fields.
 */
const EmptyShellTabPage: React.FC<EmptyShellTabPageProps> = ({
  isActive = true,
  onScroll,
  pageRef,
  containerTestID,
  scrollTestID,
}) => {
  const tw = useTailwind();
  const scrollRef = useRef<ScrollView>(null);
  const { items: feedItems } = useSocialV1Feed();
  const [hasBeenActive, setHasBeenActive] = useState(isActive);

  useEffect(() => {
    if (isActive) {
      setHasBeenActive(true);
    }
  }, [isActive]);

  useImperativeHandle(
    pageRef,
    () => ({
      scrollToOffset: (offset: number, animated = false) => {
        scrollRef.current?.scrollTo({ y: offset, animated });
      },
    }),
    [],
  );

  return (
    <Box twClassName="flex-1 bg-default" testID={containerTestID}>
      <Animated.ScrollView
        ref={scrollRef}
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('flex-grow')}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        testID={scrollTestID}
      >
        {hasBeenActive ? (
          // No top padding: `SocialV1View` already offsets the pager from the
          // tabs bar by 16, and adding another 16 here is what made the space
          // above the carousel twice the `gap-4` below it. The carousel bleeds
          // to both screen edges, so the horizontal padding sits on the posts
          // rather than on the page.
          <Box twClassName="pb-8 gap-4">
            <HotTokensCarousel />
            <Box twClassName="px-4 gap-6">
              {feedItems.map((item) => (
                <SocialFeedPositionCard key={item.id} item={item} />
              ))}
            </Box>
          </Box>
        ) : null}
      </Animated.ScrollView>
    </Box>
  );
};

export default EmptyShellTabPage;
