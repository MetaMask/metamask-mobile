import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { HotTokensCarousel } from '../SocialV1View/feed/components';
import PopularTradersCarousel from '../SocialV1View/feed/components/PopularTradersCarousel';
import SocialFeedPostShell from '../SocialV1View/feed/components/SocialFeedPostShell';
import SocialFeedPostEntrance from '../SocialV1View/feed/components/SocialFeedPostEntrance';
import SocialFeedPostingBanner from '../SocialV1View/feed/components/SocialFeedPostingBanner';
import { useSocialV1Feed } from '../SocialV1View/feed/hooks/useSocialV1Feed';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import type {
  SocialV1FeedPost,
  SocialV1FeedTab,
} from '../SocialV1View/feed/types';

/** Insert the Popular traders rail after this many Trending posts. */
export const TRENDING_POPULAR_TRADERS_INSERT_AFTER = 3;

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
  const { posts, pendingPost, pendingStartedAtMs } = useSocialV1Feed(tab);
  const [hasBeenActive, setHasBeenActive] = useState(isActive);

  useEffect(() => {
    if (isActive) {
      setHasBeenActive(true);
    }
  }, [isActive]);

  useEffect(() => {
    if (!pendingPost) {
      return;
    }
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [pendingPost]);

  // Posts present on the first render are pre-existing feed content and must
  // render at rest; anything that shows up later is a freshly committed
  // composed post and gets the entrance animation. The ref is only written in
  // an effect so a double-render never marks a new post as already seen.
  const seenPostIdsRef = useRef<Set<string> | null>(null);
  if (seenPostIdsRef.current === null) {
    seenPostIdsRef.current = new Set(posts.map((post) => post.id));
  }
  const seenPostIds = seenPostIdsRef.current;

  useEffect(() => {
    posts.forEach((post) => seenPostIds.add(post.id));
  }, [posts, seenPostIds]);

  useImperativeHandle(
    pageRef,
    () => ({
      scrollToOffset: (offset: number, animated = false) => {
        scrollRef.current?.scrollTo({ y: offset, animated });
      },
    }),
    [],
  );

  const showPopularTraders = tab === 'trending';
  const leadingPosts = showPopularTraders
    ? posts.slice(0, TRENDING_POPULAR_TRADERS_INSERT_AFTER)
    : posts;
  const trailingPosts = showPopularTraders
    ? posts.slice(TRENDING_POPULAR_TRADERS_INSERT_AFTER)
    : [];

  const renderPosts = (feedPosts: SocialV1FeedPost[]) =>
    feedPosts.map((post) => (
      <SocialFeedPostEntrance key={post.id} animate={!seenPostIds.has(post.id)}>
        <SocialFeedPostShell post={post} />
      </SocialFeedPostEntrance>
    ));

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
              {pendingPost ? (
                <SocialFeedPostingBanner
                  authorHandle={pendingPost.authorHandle}
                  authorImageUrl={pendingPost.authorImageUrl}
                  startedAtMs={pendingStartedAtMs}
                />
              ) : null}
              {renderPosts(leadingPosts)}
            </Box>
            {showPopularTraders ? <PopularTradersCarousel /> : null}
            {trailingPosts.length > 0 ? (
              <Box twClassName="px-4 gap-6">{renderPosts(trailingPosts)}</Box>
            ) : null}
          </Box>
        ) : null}
      </Animated.ScrollView>
    </Box>
  );
};

export default EmptyShellTabPage;
