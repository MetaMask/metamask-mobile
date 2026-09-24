import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import PerpsTokenLogo from '../../../../../UI/Perps/components/PerpsTokenLogo';
import { ExplorePill } from '../../../../../UI/Trending/components/ExplorePill';
import { SectionPillsSkeleton } from '../../../../../UI/Trending/components/SectionPillsSkeleton';
import { useSocialV1HotTokens } from '../hooks/useSocialV1HotTokens';
import type { SocialV1HotToken } from '../types';
import {
  getSocialV1HotTokenChipTestId,
  SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID,
  SOCIAL_V1_HOT_TOKENS_TRACK_TEST_ID,
} from './HotTokensCarousel.testIds';

/**
 * Icon diameter in pixels, matching the Perps pill rails. `PerpsTokenLogo`
 * takes pixels rather than an `AvatarTokenSize` token.
 */
const LOGO_SIZE = 24;

/** Slow news-footer crawl. */
const MARQUEE_PIXELS_PER_SECOND = 24;

export interface HotTokensCarouselProps {
  /** Opens the topic. Omitted until the hot-topic destination exists. */
  onTokenPress?: (token: SocialV1HotToken) => void;
}

const HotTokenChip: React.FC<{
  token: SocialV1HotToken;
  onPress?: (token: SocialV1HotToken) => void;
  testID: string;
}> = ({ token, onPress, testID }) => (
  // ExplorePill sets `shrink` so a wrapping rail can compress labels. The
  // ticker must keep each chip at intrinsic width or the track never overflows
  // the viewport and the marquee never starts.
  <Box twClassName="shrink-0">
    <ExplorePill
      testID={testID}
      leading={
        <PerpsTokenLogo
          symbol={token.symbol}
          size={LOGO_SIZE}
          recyclingKey={token.symbol}
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
}> = ({ tokens, onPress, onLayout, testID, idSuffix }) => (
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
        testID={getSocialV1HotTokenChipTestId(
          idSuffix ? `${token.id}${idSuffix}` : token.id,
        )}
      />
    ))}
  </Box>
);

/**
 * HotTokensCarousel -- the rail of trending-topic chips above the Social V1
 * feed. When the chips overflow the viewport they crawl like a news ticker.
 * The rail is a gesture-handler `ScrollView` so a horizontal drag scrubs the
 * chips instead of changing Social tabs, and the crawl pauses while the
 * finger is down.
 */
const HotTokensCarousel: React.FC<HotTokensCarouselProps> = ({
  onTokenPress,
}) => {
  const { tokens, isLoading } = useSocialV1HotTokens();
  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);
  const trackWidthRef = useRef(0);
  const pausedRef = useRef(false);
  const draggingRef = useRef(false);
  const shouldMarqueeRef = useRef(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  const shouldMarquee =
    trackWidth > 0 && viewportWidth > 0 && trackWidth > viewportWidth;
  shouldMarqueeRef.current = shouldMarquee;

  const handleViewportLayout = useCallback((event: LayoutChangeEvent) => {
    setViewportWidth(event.nativeEvent.layout.width);
  }, []);

  const handleTrackLayout = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    trackWidthRef.current = width;
    setTrackWidth(width);
  }, []);

  const wrapOffset = useCallback((x: number): number => {
    const width = trackWidthRef.current;
    if (width <= 0 || x < width) {
      return x;
    }
    return x % width;
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const wrapped = wrapOffset(event.nativeEvent.contentOffset.x);
      if (wrapped !== event.nativeEvent.contentOffset.x) {
        offsetRef.current = wrapped;
        scrollRef.current?.scrollTo({ x: wrapped, animated: false });
        return;
      }
      offsetRef.current = wrapped;
    },
    [wrapOffset],
  );

  const pause = useCallback(() => {
    pausedRef.current = true;
  }, []);

  const resume = useCallback(() => {
    if (!draggingRef.current) {
      pausedRef.current = false;
    }
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    draggingRef.current = true;
    pausedRef.current = true;
  }, []);

  const handleScrollEnd = useCallback(() => {
    draggingRef.current = false;
    pausedRef.current = false;
  }, []);

  useEffect(() => {
    let frame = 0;
    let lastMs = Date.now();

    const tick = () => {
      const now = Date.now();
      const dtMs = now - lastMs;
      lastMs = now;

      if (shouldMarqueeRef.current && !pausedRef.current) {
        const width = trackWidthRef.current;
        if (width > 0) {
          const next = wrapOffset(
            offsetRef.current + (MARQUEE_PIXELS_PER_SECOND * dtMs) / 1000,
          );
          offsetRef.current = next;
          scrollRef.current?.scrollTo({ x: next, animated: false });
        }
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [wrapOffset]);

  const loopTokens = useMemo(
    () => (shouldMarquee ? tokens : []),
    [shouldMarquee, tokens],
  );

  if (!isLoading && tokens.length === 0) {
    return null;
  }

  if (isLoading) {
    return <SectionPillsSkeleton rowCount={1} />;
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      bounces={false}
      directionalLockEnabled
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      onLayout={handleViewportLayout}
      onScroll={handleScroll}
      onScrollBeginDrag={handleScrollBeginDrag}
      onScrollEndDrag={handleScrollEnd}
      onMomentumScrollEnd={handleScrollEnd}
      onTouchStart={pause}
      onTouchEnd={resume}
      onTouchCancel={resume}
      scrollEventThrottle={16}
      testID={SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        <HotTokenTrack
          tokens={tokens}
          onPress={onTokenPress}
          onLayout={handleTrackLayout}
          testID={SOCIAL_V1_HOT_TOKENS_TRACK_TEST_ID}
        />
        {loopTokens.length > 0 ? (
          <HotTokenTrack
            tokens={loopTokens}
            onPress={onTokenPress}
            idSuffix="-loop"
          />
        ) : null}
      </Box>
    </ScrollView>
  );
};

export default HotTokensCarousel;
