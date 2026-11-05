import {
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import React, {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
} from 'react';
import {
  Animated as RNAnimated,
  Easing as RNEasing,
  type LayoutChangeEvent,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { getHardwareTier } from '../../../../../../util/deviceCapability';
import { playSelection } from '../../../../../../util/haptics';
import PositionTokenAvatar from '../../../../../UI/SocialFeed/components/PositionTokenAvatar';
import { ExplorePill } from '../../../../../UI/Trending/components/ExplorePill';
import { SectionPillsSkeleton } from '../../../../../UI/Trending/components/SectionPillsSkeleton';
import type { SocialV1HotToken } from '../types';
import {
  getSocialV1HotTokenChipTestId,
  SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID,
  SOCIAL_V1_HOT_TOKENS_PAN_GESTURE_ID,
  SOCIAL_V1_HOT_TOKENS_RAIL_TEST_ID,
  SOCIAL_V1_HOT_TOKENS_TRACK_TEST_ID,
} from './HotTokensCarousel.testIds';
import {
  DISPERSE,
  DOCK_LEFT,
  getDisperseMotion,
  getReassembleDelay,
  isPillOnScreen,
  LIGHT_FADE_DURATION,
  REASSEMBLE,
  wrapOffset,
} from './hotTokenRailMotion';
import SelectedHotTokenChip from './SelectedHotTokenChip';

const EMPTY_TOKENS: SocialV1HotToken[] = [];

/** Slow news-footer crawl. */
const MARQUEE_PIXELS_PER_SECOND = 24;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    flexShrink: 0,
  },
  dock: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: DOCK_LEFT,
  },
});

/** Where a pressed pill sat in the viewport, so its docked copy can fly out of it. */
interface PillOrigin {
  tokenId: string;
  left: number;
  center: number;
}

/** The rail's pills scatter while a chip is docked, away from this point. */
interface PillDispersal {
  originCenter: number;
  /**
   * Hidden at once: the docked chip covers its spot as it takes off. Both the
   * primary and the loop copy match, since a track that barely overflows can
   * show the two side by side.
   */
  sourceTokenId: string | null;
  /** Low-end hardware or Reduce Motion: a plain fade, no stagger or motion. */
  isLight: boolean;
}

interface DockedChip {
  key: number;
  token: SocialV1HotToken;
  origin: PillOrigin | null;
  animatesIn: boolean;
  isExiting: boolean;
}

export interface HotTokensCarouselProps {
  /** Ranked chips, most frequent first. */
  tokens?: SocialV1HotToken[];
  /** True until the first ranking exists; shows the skeleton. */
  isLoading?: boolean;
  /** Chip id of the asset currently filtering the feed. */
  selectedTokenId?: string | null;
  /** Filters the feed to this asset. Pressing the selected chip clears it. */
  onTokenPress?: (token: SocialV1HotToken) => void;
  /**
   * False while the rail's pager page is off screen. Stops the crawl, since the
   * pager keeps every page mounted.
   */
  isActive?: boolean;
}

interface HotTokenPillProps {
  token: SocialV1HotToken;
  chipId: string;
  /** 0 for the primary track, 1 for the marquee's loop copy. */
  trackIndex: number;
  dispersal: PillDispersal | null;
  /** Where the crawl sits right now, in px. Read on press and on scatter. */
  readOffset: () => number;
  trackWidth: SharedValue<number>;
  viewportWidth: SharedValue<number>;
  onPress?: (token: SocialV1HotToken, origin: PillOrigin | null) => void;
}

const HotTokenPill: React.FC<HotTokenPillProps> = ({
  token,
  chipId,
  trackIndex,
  dispersal,
  readOffset,
  trackWidth,
  viewportWidth,
  onPress,
}) => {
  const layoutRef = useRef<{ x: number; width: number } | null>(null);
  const [startsHidden] = useState(dispersal !== null);
  const opacity = useSharedValue(startsHidden ? 0 : 1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const previousDispersalRef = useRef(dispersal);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    layoutRef.current = { x, width };
  }, []);

  const measureInViewport = useCallback(() => {
    const layout = layoutRef.current;
    if (!layout) {
      return null;
    }
    const left = trackIndex * trackWidth.value + layout.x - readOffset();
    return { left, width: layout.width };
  }, [readOffset, trackIndex, trackWidth]);

  useEffect(() => {
    const previous = previousDispersalRef.current;
    previousDispersalRef.current = dispersal;
    if (previous === dispersal) {
      return;
    }
    const placement = measureInViewport();
    const viewport = viewportWidth.value;
    const isOnScreen =
      placement !== null &&
      isPillOnScreen(placement.left, placement.width, viewport);

    if (dispersal) {
      if (token.id === dispersal.sourceTokenId || !placement || !isOnScreen) {
        opacity.value = 0;
        return;
      }
      if (dispersal.isLight) {
        opacity.value = withTiming(0, { duration: LIGHT_FADE_DURATION });
        return;
      }
      const { delay, shiftX } = getDisperseMotion(
        placement.left + placement.width / 2,
        dispersal.originCenter,
      );
      const config = { duration: DISPERSE.duration, easing: DISPERSE.easing };
      opacity.value = withDelay(delay, withTiming(0, config));
      translateX.value = withDelay(delay, withTiming(shiftX, config));
      translateY.value = withDelay(delay, withTiming(DISPERSE.shiftY, config));
      scale.value = withDelay(delay, withTiming(DISPERSE.scale, config));
      return;
    }

    if (!placement || !isOnScreen) {
      opacity.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      scale.value = 1;
      return;
    }
    if (previous?.isLight) {
      translateX.value = 0;
      translateY.value = 0;
      scale.value = 1;
      opacity.value = withTiming(1, { duration: LIGHT_FADE_DURATION });
      return;
    }
    // A fully scattered pill restarts from below; one caught mid-scatter
    // turns back from where it is.
    if (opacity.value < 0.01) {
      translateX.value = 0;
      translateY.value = REASSEMBLE.shiftY;
      scale.value = REASSEMBLE.scale;
    }
    const delay = getReassembleDelay(placement.left, viewport);
    const config = { duration: REASSEMBLE.duration, easing: REASSEMBLE.easing };
    opacity.value = withDelay(delay, withTiming(1, config));
    translateX.value = withDelay(delay, withTiming(0, config));
    translateY.value = withDelay(delay, withTiming(0, config));
    scale.value = withDelay(delay, withTiming(1, config));
  }, [
    dispersal,
    measureInViewport,
    opacity,
    scale,
    token.id,
    translateX,
    translateY,
    viewportWidth,
  ]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handlePress = useCallback(() => {
    const placement = measureInViewport();
    onPress?.(
      token,
      placement
        ? {
            tokenId: token.id,
            left: placement.left,
            center: placement.left + placement.width / 2,
          }
        : null,
    );
  }, [measureInViewport, onPress, token]);

  return (
    // ExplorePill sets `shrink` so a wrapping rail can compress labels. The
    // ticker must keep each chip at intrinsic width or the track never
    // overflows the viewport and the marquee never starts.
    <Animated.View style={[styles.pill, pillStyle]} onLayout={handleLayout}>
      <ExplorePill
        testID={getSocialV1HotTokenChipTestId(chipId)}
        accessibilityState={{ selected: false }}
        leading={
          <Box twClassName="mr-1">
            <PositionTokenAvatar
              position={token.avatar}
              size={AvatarTokenSize.Sm}
            />
          </Box>
        }
        title={token.label}
        onPress={handlePress}
      />
    </Animated.View>
  );
};

const HotTokenTrack: React.FC<
  Omit<HotTokenPillProps, 'token' | 'chipId'> & {
    tokens: SocialV1HotToken[];
    onLayout?: (event: LayoutChangeEvent) => void;
    testID?: string;
    idSuffix?: string;
  }
> = ({ tokens, onLayout, testID, idSuffix, ...pillProps }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="pl-4 gap-2"
    onLayout={onLayout}
    testID={testID}
  >
    {tokens.map((token) => {
      const chipId = idSuffix ? `${token.id}${idSuffix}` : token.id;
      return (
        <HotTokenPill
          key={chipId}
          token={token}
          chipId={chipId}
          {...pillProps}
        />
      );
    })}
  </Box>
);

/**
 * HotTokensCarousel -- the rail of asset chips above the Social V1 feed. When
 * the chips overflow the viewport they crawl like a news ticker.
 *
 * Pressing a chip filters the feed on it: the crawl brakes, the other chips
 * scatter away from it, and a selected copy springs from its spot to the
 * rail's left edge, where its close icon slides open. Pressing that copy
 * clears the filter: it drops away and the chips rise back in, left to right,
 * with the crawl picking back up from where it stopped.
 *
 * The crawl is a native-driver `Animated.timing` on `translateX`, not
 * `ScrollView.scrollTo`. A gesture-handler ScrollView that `scrollTo`s every
 * frame keeps a native scroll gesture alive on PagerView page 0 and cancels
 * taps on the rest of Trending (reactions, overflow menu, Popular traders). A
 * pan on this rail still wins over the pager so scrubbing the chips does not
 * change tabs.
 *
 * Low-end hardware keeps the rail still, and its chips fade in place instead
 * of scattering. Reduce Motion gets the same fade, and the docked chip fades
 * in place instead of flying. The pan stays, so the chips can still be
 * scrubbed.
 *
 * Icons go through `PositionTokenAvatar`, the same resolution the position
 * cards use.
 */
const HotTokensCarousel: React.FC<HotTokensCarouselProps> = ({
  tokens = EMPTY_TOKENS,
  isLoading = false,
  selectedTokenId: committedSelectedTokenId = null,
  onTokenPress,
  isActive = true,
}) => {
  const [isLowHardware] = useState(() => getHardwareTier() === 'LOW');
  const reduceMotion = useReducedMotion();
  // A press moves the rail at once and hands the feed's filter to a
  // transition, so the animation does not wait on the feed re-rendering. The
  // latest guess holds until every pending press has reached the page, so a
  // page update that only catches up to an earlier press cannot undo a later
  // one.
  const [selectedTokenId, setOptimisticSelectedTokenId] = useOptimistic<
    string | null,
    string | null
  >(committedSelectedTokenId, (_current, next) => next);
  const rankedToken = useMemo(
    () => tokens.find((token) => token.id === selectedTokenId) ?? null,
    [selectedTokenId, tokens],
  );
  // The rail is ranked from the unfiltered feed. Remember the selected chip so
  // a refetch that drops that asset still leaves a chip the user can tap to
  // clear the filter.
  const heldTokenRef = useRef<SocialV1HotToken | null>(null);
  if (!selectedTokenId) {
    heldTokenRef.current = null;
  } else if (rankedToken) {
    heldTokenRef.current = rankedToken;
  }
  const selectedToken =
    rankedToken ??
    (heldTokenRef.current?.id === selectedTokenId
      ? heldTokenRef.current
      : null);

  // The docked chip outlives the selection by its exit animation, so it is
  // tracked apart from `selectedTokenId`.
  const [pendingOrigin, setPendingOrigin] = useState<PillOrigin | null>(null);
  const [docked, setDocked] = useState<DockedChip | null>(() =>
    selectedToken
      ? {
          key: 0,
          token: selectedToken,
          origin: null,
          animatesIn: false,
          isExiting: false,
        }
      : null,
  );
  const [dockedForId, setDockedForId] = useState(
    selectedToken ? selectedTokenId : null,
  );
  const dockTargetId = selectedToken ? selectedTokenId : null;
  if (dockedForId !== dockTargetId) {
    setDockedForId(dockTargetId);
    setPendingOrigin(null);
    if (selectedToken) {
      const origin =
        pendingOrigin?.tokenId === selectedToken.id ? pendingOrigin : null;
      setDocked((current) => ({
        key: (current?.key ?? 0) + 1,
        token: selectedToken,
        origin,
        animatesIn: true,
        isExiting: false,
      }));
    } else if (docked && !docked.isExiting) {
      setDocked({ ...docked, isExiting: true });
    }
  }
  const isSelected = Boolean(docked && !docked.isExiting);

  const dispersal = useMemo<PillDispersal | null>(
    () =>
      docked && !docked.isExiting
        ? {
            originCenter: docked.origin?.center ?? DOCK_LEFT,
            sourceTokenId: docked.origin?.tokenId ?? null,
            isLight: isLowHardware || reduceMotion,
          }
        : null,
    [docked, isLowHardware, reduceMotion],
  );

  const handleDockExited = useCallback((key: number) => {
    setDocked((current) => (current?.key === key ? null : current));
  }, []);

  // Visual crawl. Native-driver timing writes translateX straight to the view,
  // so a lap does not commit the feed tree every frame.
  const shift = useRef(new RNAnimated.Value(0)).current;
  const trackWidthSv = useSharedValue(0);
  const viewportWidthSv = useSharedValue(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const runIdRef = useRef(0);
  const dragStartRef = useRef(0);
  // The crawl's position, predicted on the JS clock so a press can place the
  // chip without reading the native value every frame.
  const lapRef = useRef({ running: false, origin: 0, startedAt: 0 });

  const shouldMarquee =
    trackWidth > 0 && viewportWidth > 0 && trackWidth > viewportWidth;

  const readOffset = useCallback(() => {
    const lap = lapRef.current;
    const width = trackWidthRef.current;
    if (!lap.running || width <= 0) {
      return lap.origin;
    }
    const elapsedSeconds = (Date.now() - lap.startedAt) / 1000;
    return wrapOffset(
      lap.origin + MARQUEE_PIXELS_PER_SECOND * elapsedSeconds,
      width,
    );
  }, []);

  const placeAt = useCallback(
    (position: number) => {
      lapRef.current = { running: false, origin: position, startedAt: 0 };
      shift.setValue(position);
    },
    [shift],
  );

  // One native timing per lap. JS wakes only at the wrap, which the loop copy
  // hides. `runIdRef` drops the callback if a stop landed during the lap.
  const runFrom = useCallback(
    (from: number) => {
      const id = ++runIdRef.current;
      const travel = (position: number) => {
        const width = trackWidthRef.current;
        if (width <= 0) {
          return;
        }
        lapRef.current = {
          running: true,
          origin: position,
          startedAt: Date.now(),
        };
        shift.setValue(position);
        RNAnimated.timing(shift, {
          toValue: width,
          duration: ((width - position) / MARQUEE_PIXELS_PER_SECOND) * 1000,
          easing: RNEasing.linear,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished && id === runIdRef.current) {
            travel(0);
          }
        });
      };
      travel(wrapOffset(from, trackWidthRef.current));
    },
    [shift],
  );

  const stopAt = useCallback(
    (after?: (value: number) => void) => {
      const id = ++runIdRef.current;
      const position = readOffset();
      placeAt(position);
      shift.stopAnimation(() => {
        if (id === runIdRef.current) {
          after?.(position);
        }
      });
    },
    [placeAt, readOffset, shift],
  );

  const shouldRun = isActive && !isLowHardware && shouldMarquee && !isSelected;
  const shouldRunRef = useRef(shouldRun);

  // A docked chip holds the crawl where it stopped, so the chips come back
  // where they left.
  useEffect(() => {
    shouldRunRef.current = shouldRun;
    stopAt((value) => {
      if (shouldRun) {
        runFrom(value);
      }
    });
    return () => {
      runIdRef.current += 1;
      shift.stopAnimation();
    };
  }, [runFrom, shift, shouldRun, stopAt, trackWidth]);

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
      trackWidthRef.current = width;
      trackWidthSv.value = width;
      setTrackWidth(width);
    },
    [trackWidthSv],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .withTestId(SOCIAL_V1_HOT_TOKENS_PAN_GESTURE_ID)
        .enabled(!isSelected)
        .activeOffsetX([-10, 10])
        .failOffsetY([-12, 12])
        .onBegin(() => {
          stopAt((value) => {
            dragStartRef.current = value;
          });
        })
        .onUpdate((event) => {
          const width = trackWidthRef.current;
          if (width <= 0) {
            return;
          }
          placeAt(wrapOffset(dragStartRef.current - event.translationX, width));
        })
        .onFinalize(() => {
          stopAt((value) => {
            if (shouldRunRef.current) {
              runFrom(value);
            }
          });
        }),
    [isSelected, placeAt, runFrom, stopAt],
  );

  const trackStyle = {
    transform: [{ translateX: RNAnimated.multiply(shift, -1) }],
  };

  const loopTokens = useMemo(
    () => (shouldMarquee ? tokens : []),
    [shouldMarquee, tokens],
  );

  const handleTokenPress = useCallback(
    (token: SocialV1HotToken) => {
      if (!onTokenPress) {
        return;
      }
      playSelection().catch(() => undefined);
      const nextId = token.id === selectedTokenId ? null : token.id;
      startTransition(() => {
        setOptimisticSelectedTokenId(nextId);
        onTokenPress(token);
      });
    },
    [onTokenPress, selectedTokenId, setOptimisticSelectedTokenId],
  );

  const handlePillPress = useCallback(
    (token: SocialV1HotToken, origin: PillOrigin | null) => {
      if (!onTokenPress) {
        return;
      }
      setPendingOrigin(origin);
      handleTokenPress(token);
    },
    [handleTokenPress, onTokenPress],
  );

  // Returning null instead of an empty wrapper lets the page's gap collapse,
  // rather than leaving a rail-shaped hole above the first post.
  if (!isLoading && tokens.length === 0 && !docked) {
    return null;
  }

  if (isLoading) {
    return <SectionPillsSkeleton rowCount={1} />;
  }

  const trackProps = {
    dispersal,
    readOffset,
    trackWidth: trackWidthSv,
    viewportWidth: viewportWidthSv,
    onPress: handlePillPress,
  };

  return (
    <Box
      onLayout={handleViewportLayout}
      twClassName="overflow-hidden min-h-10"
      testID={SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID}
    >
      <GestureDetector gesture={pan}>
        <RNAnimated.View
          style={[styles.row, trackStyle]}
          testID={SOCIAL_V1_HOT_TOKENS_RAIL_TEST_ID}
          pointerEvents={isSelected ? 'none' : 'auto'}
          accessibilityElementsHidden={isSelected}
          importantForAccessibility={
            isSelected ? 'no-hide-descendants' : 'auto'
          }
        >
          <HotTokenTrack
            {...trackProps}
            tokens={tokens}
            trackIndex={0}
            onLayout={handleTrackLayout}
            testID={SOCIAL_V1_HOT_TOKENS_TRACK_TEST_ID}
          />
          {loopTokens.length > 0 ? (
            <HotTokenTrack
              {...trackProps}
              tokens={loopTokens}
              trackIndex={1}
              idSuffix="-loop"
            />
          ) : null}
        </RNAnimated.View>
      </GestureDetector>
      {docked ? (
        <View pointerEvents="box-none" style={styles.dock}>
          <SelectedHotTokenChip
            key={docked.key}
            dockKey={docked.key}
            token={
              !docked.isExiting && selectedToken ? selectedToken : docked.token
            }
            originLeft={docked.origin?.left ?? null}
            animatesIn={docked.animatesIn}
            isExiting={docked.isExiting}
            reduceMotion={reduceMotion}
            onPress={handleTokenPress}
            onExited={handleDockExited}
          />
        </View>
      ) : null}
    </Box>
  );
};

export default HotTokensCarousel;
