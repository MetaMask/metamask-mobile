import {
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import PositionTokenAvatar from '../../../components/PositionTokenAvatar';
import { ExplorePill } from '../../../../../UI/Trending/components/ExplorePill';
import { SectionPillsSkeleton } from '../../../../../UI/Trending/components/SectionPillsSkeleton';
import { useSocialV1HotTokens } from '../hooks/useSocialV1HotTokens';
import type { SocialV1FeedPost, SocialV1HotToken } from '../types';
import {
  getSocialV1HotTokenChipTestId,
  SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID,
  SOCIAL_V1_HOT_TOKENS_TRACK_TEST_ID,
} from './HotTokensCarousel.testIds';

const EMPTY_POSTS: SocialV1FeedPost[] = [];

/** Slow news-footer crawl. */
const MARQUEE_PIXELS_PER_SECOND = 24;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

const wrapOffset = (x: number, width: number): number => {
  'worklet';
  if (width <= 0) {
    return 0;
  }
  const wrapped = x % width;
  return wrapped < 0 ? wrapped + width : wrapped;
};

export interface HotTokensCarouselProps {
  /** Loaded feed posts the ranking is counted from. */
  posts?: readonly SocialV1FeedPost[];
  /** True during the feed's first fetch, before any post is on screen. */
  isLoading?: boolean;
  /** Chip id of the asset currently filtering the feed. */
  selectedTokenId?: string | null;
  /** Filters the feed to this asset. Pressing the selected chip clears it. */
  onTokenPress?: (token: SocialV1HotToken) => void;
}

const HotTokenChip: React.FC<{
  token: SocialV1HotToken;
  onPress?: (token: SocialV1HotToken) => void;
  testID: string;
  isSelected?: boolean;
}> = ({ token, onPress, testID, isSelected = false }) => (
  // ExplorePill sets `shrink` so a wrapping rail can compress labels. The
  // ticker must keep each chip at intrinsic width or the track never overflows
  // the viewport and the marquee never starts.
  <Box twClassName="shrink-0">
    <ExplorePill
      testID={testID}
      isSelected={isSelected}
      leading={
        <PositionTokenAvatar
          position={token.avatar}
          size={AvatarTokenSize.Sm}
        />
      }
      title={token.label}
      onPress={() => onPress?.(token)}
    />
  </Box>
);

const HotTokenTrack: React.FC<{
  tokens: SocialV1HotToken[];
  onPress?: (token: SocialV1HotToken) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  testID?: string;
  idSuffix?: string;
  selectedTokenId?: string | null;
}> = ({ tokens, onPress, onLayout, testID, idSuffix, selectedTokenId }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="pl-4 gap-2"
    onLayout={onLayout}
    testID={testID}
  >
    {tokens.map((token) => (
      <HotTokenChip
        key={idSuffix ? `${token.id}${idSuffix}` : token.id}
        token={token}
        onPress={onPress}
        isSelected={token.id === selectedTokenId}
        testID={getSocialV1HotTokenChipTestId(
          idSuffix ? `${token.id}${idSuffix}` : token.id,
        )}
      />
    ))}
  </Box>
);

/**
 * HotTokensCarousel -- the rail of asset chips above the Social V1 feed. When
 * the chips overflow the viewport they crawl like a news ticker.
 *
 * The crawl is a `translateX` on the track, not `ScrollView.scrollTo`. A
 * gesture-handler ScrollView that `scrollTo`s every frame keeps a native
 * scroll gesture alive on PagerView page 0 and cancels taps on the rest of
 * Trending (reactions, overflow menu, Popular traders). A pan on this rail
 * still wins over the pager so scrubbing the chips does not change tabs.
 *
 * Chips are the assets that appear most often in `posts`. Icons go through
 * `PositionTokenAvatar`, the same resolution the position cards use.
 */
const HotTokensCarousel: React.FC<HotTokensCarouselProps> = ({
  posts = EMPTY_POSTS,
  isLoading: feedIsLoading = false,
  selectedTokenId = null,
  onTokenPress,
}) => {
  const { tokens, isLoading } = useSocialV1HotTokens(
    posts,
    feedIsLoading,
    selectedTokenId,
  );
  const offset = useSharedValue(0);
  const dragStartOffset = useSharedValue(0);
  const paused = useSharedValue(false);
  const trackWidthSv = useSharedValue(0);
  const viewportWidthSv = useSharedValue(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  const shouldMarquee =
    trackWidth > 0 && viewportWidth > 0 && trackWidth > viewportWidth;

  const handleViewportLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      viewportWidthSv.value = width;
      setViewportWidth(width);
    },
    [viewportWidthSv],
  );

  const handleTrackLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      trackWidthSv.value = width;
      setTrackWidth(width);
    },
    [trackWidthSv],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-12, 12])
        .onBegin(() => {
          'worklet';
          paused.value = true;
          dragStartOffset.value = offset.value;
        })
        .onUpdate((event) => {
          'worklet';
          const width = trackWidthSv.value;
          if (width <= 0) {
            return;
          }
          offset.value = wrapOffset(
            dragStartOffset.value - event.translationX,
            width,
          );
        })
        .onFinalize(() => {
          'worklet';
          paused.value = false;
        }),
    [dragStartOffset, offset, paused, trackWidthSv],
  );

  const tickMarquee = useCallback(
    (frame: { timeSincePreviousFrame: number | null }) => {
      'worklet';
      const width = trackWidthSv.value;
      const viewport = viewportWidthSv.value;
      if (paused.value || width <= 0 || viewport <= 0 || width <= viewport) {
        return;
      }
      const dtMs = frame.timeSincePreviousFrame ?? 0;
      if (dtMs <= 0) {
        return;
      }
      offset.value = wrapOffset(
        offset.value + (MARQUEE_PIXELS_PER_SECOND * dtMs) / 1000,
        width,
      );
    },
    [offset, paused, trackWidthSv, viewportWidthSv],
  );

  useFrameCallback(tickMarquee);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -offset.value }],
  }));

  const loopTokens = useMemo(
    () => (shouldMarquee ? tokens : []),
    [shouldMarquee, tokens],
  );

  // Returning null instead of an empty wrapper lets the page's gap collapse,
  // rather than leaving a rail-shaped hole above the first post.
  if (!isLoading && tokens.length === 0) {
    return null;
  }

  if (isLoading) {
    return <SectionPillsSkeleton rowCount={1} />;
  }

  return (
    <Box
      onLayout={handleViewportLayout}
      twClassName="overflow-hidden"
      testID={SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID}
    >
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.row, trackStyle]}>
          <HotTokenTrack
            tokens={tokens}
            onPress={onTokenPress}
            onLayout={handleTrackLayout}
            testID={SOCIAL_V1_HOT_TOKENS_TRACK_TEST_ID}
            selectedTokenId={selectedTokenId}
          />
          {loopTokens.length > 0 ? (
            <HotTokenTrack
              tokens={loopTokens}
              onPress={onTokenPress}
              idSuffix="-loop"
              selectedTokenId={selectedTokenId}
            />
          ) : null}
        </Animated.View>
      </GestureDetector>
    </Box>
  );
};

export default HotTokensCarousel;
