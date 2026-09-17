import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import SocialFeedPostShell from '../SocialV1View/feed/components/SocialFeedPostShell';
import SocialFeedPostingBanner from '../SocialV1View/feed/components/SocialFeedPostingBanner';
import { useSocialV1Feed } from '../SocialV1View/feed/hooks/useSocialV1Feed';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import type { SocialV1FeedTab } from '../SocialV1View/feed/types';

type AnimatedScrollHandler = React.ComponentProps<
  typeof Animated.ScrollView
>['onScroll'];

export type SocialFeedShellTab = SocialV1FeedTab;

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
 * API supplies post/comment fields. Trending also shows locally composed posts.
 */
const EmptyShellTabPage: React.FC<EmptyShellTabPageProps> = ({
  tab,
  isActive = true,
  onScroll,
  pageRef,
  containerTestID,
  scrollTestID,
}) => {
  const tw = useTailwind();
  const scrollRef = useRef<ScrollView>(null);
  const { posts, pendingPost } = useSocialV1Feed(tab);
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
          <Box twClassName="px-4 pt-4 pb-8 gap-6">
            {pendingPost ? (
              <SocialFeedPostingBanner
                authorHandle={pendingPost.authorHandle}
              />
            ) : null}
            {posts.map((post) => (
              <Animated.View key={post.id} entering={FadeInDown.duration(280)}>
                <SocialFeedPostShell post={post} />
              </Animated.View>
            ))}
          </Box>
        ) : null}
      </Animated.ScrollView>
    </Box>
  );
};

export default EmptyShellTabPage;
