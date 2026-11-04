import {
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  TextColor,
} from '@metamask/design-system-react-native';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type LayoutChangeEvent, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { getHardwareTier } from '../../../../../../util/deviceCapability';
import { playSelection } from '../../../../../../util/haptics';
import PositionTokenAvatar from '../../../../../UI/SocialFeed/components/PositionTokenAvatar';
import { ExplorePill } from '../../../../../UI/Trending/components/ExplorePill';
import { SectionPillsSkeleton } from '../../../../../UI/Trending/components/SectionPillsSkeleton';
import type { SocialV1HotToken } from '../types';
import {
  getSocialV1HotTokenCloseTestId,
  getSocialV1HotTokenChipTestId,
  SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID,
  SOCIAL_V1_HOT_TOKENS_TRACK_TEST_ID,
} from './HotTokensCarousel.testIds';

const EMPTY_TOKENS: SocialV1HotToken[] = [];

/** Slow news-footer crawl. */
const MARQUEE_PIXELS_PER_SECOND = 24;

/**
 * One slide to the left edge. Low-end hardware already skips the marquee;
 * this stays on every tier because it is a single transform and fade, and
 * network tier does not gate local motion.
 */
const CHIP_MOVE_MS = 280;
const LOOP_SUFFIX = '-loop';
/** The track's `pl-4`, used until the first chip has been measured. */
const DEFAULT_LEADING_X = 16;

const CHIP_MOTION = {
  duration: CHIP_MOVE_MS,
  easing: Easing.out(Easing.cubic),
};

type RestingPhase = 'browse' | 'parked';
type ChipRole = 'rest' | 'traveler' | 'companion';

interface ChipFlight {
  kind: 'collapse' | 'expand';
  /** Chip instance that moves; a `-loop` copy when the tap hit the loop. */
  travelerId: string;
  generation: number;
  /** Closing mid-slide: run the open motion backwards from where it is. */
  reverse: boolean;
  /**
   * Expand only: the chip's home is past the viewport, so the track scrolls
   * to bring it under the parked chip instead of the chip sliding off screen.
   */
  trackTarget: number;
}

/**
 * `progress` is 0 with the full rail at rest and 1 with the chip parked. Only
 * chips whose React role says they are in flight read it, so a value written
 * a frame before React commits the matching rail cannot move a resting chip.
 */
interface RailMotionValues {
  progress: SharedValue<number>;
  travelerShift: SharedValue<number>;
}

interface ChipLayout {
  x: number;
  width: number;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexShrink: 0,
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

const HotTokenChip: React.FC<{
  token: SocialV1HotToken;
  instanceId: string;
  onPress?: (token: SocialV1HotToken, instanceId: string) => void;
  onLayout?: (instanceId: string, layout: ChipLayout) => void;
  testID: string;
  closeTestID: string;
  isSelected?: boolean;
  role: ChipRole;
  motion: RailMotionValues;
}> = ({
  token,
  instanceId,
  onPress,
  onLayout,
  testID,
  closeTestID,
  isSelected = false,
  role,
  motion,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    if (role === 'traveler') {
      return {
        opacity: 1,
        transform: [
          { translateX: motion.travelerShift.value * motion.progress.value },
        ],
        zIndex: 1,
      };
    }
    if (role === 'companion') {
      return {
        opacity: 1 - motion.progress.value,
        transform: [{ translateX: 0 }],
        zIndex: 0,
      };
    }
    return { opacity: 1, transform: [{ translateX: 0 }], zIndex: 0 };
  }, [role]);
  const isCompanion = role === 'companion';

  return (
    // ExplorePill sets `shrink` so a wrapping rail can compress labels. The
    // ticker must keep each chip at intrinsic width or the track never overflows
    // the viewport and the marquee never starts.
    <Animated.View
      style={[styles.chip, animatedStyle]}
      pointerEvents={isCompanion ? 'none' : 'auto'}
      accessibilityElementsHidden={isCompanion}
      onLayout={(event) => {
        const { x, width } = event.nativeEvent.layout;
        onLayout?.(instanceId, { x, width });
      }}
    >
      <ExplorePill
        testID={testID}
        accessibilityState={{ selected: isSelected }}
        twClassName={
          isSelected ? 'bg-icon-default border-transparent' : undefined
        }
        leading={
          <Box twClassName="mr-1">
            <PositionTokenAvatar
              position={token.avatar}
              size={AvatarTokenSize.Sm}
            />
          </Box>
        }
        title={token.label}
        titleTextColor={
          isSelected ? TextColor.InfoInverse : TextColor.TextDefault
        }
        onPress={() => onPress?.(token, instanceId)}
        trailing={
          isSelected ? (
            <Box twClassName="ml-1">
              <Icon
                name={IconName.Close}
                size={IconSize.Sm}
                color={IconColor.IconInverse}
                testID={closeTestID}
              />
            </Box>
          ) : null
        }
      />
    </Animated.View>
  );
};

const HotTokenTrack: React.FC<{
  tokens: SocialV1HotToken[];
  onPress?: (token: SocialV1HotToken, instanceId: string) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  onChipLayout?: (instanceId: string, layout: ChipLayout) => void;
  testID?: string;
  idSuffix?: string;
  selectedTokenId?: string | null;
  flight: ChipFlight | null;
  motion: RailMotionValues;
}> = ({
  tokens,
  onPress,
  onLayout,
  onChipLayout,
  testID,
  idSuffix,
  selectedTokenId,
  flight,
  motion,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="pl-4 gap-2"
    onLayout={onLayout}
    testID={testID}
  >
    {tokens.map((token) => {
      const chipId = idSuffix ? `${token.id}${idSuffix}` : token.id;
      let role: ChipRole = 'rest';
      if (flight) {
        role = chipId === flight.travelerId ? 'traveler' : 'companion';
      }
      return (
        <HotTokenChip
          key={chipId}
          token={token}
          instanceId={chipId}
          onPress={onPress}
          onLayout={onChipLayout}
          isSelected={token.id === selectedTokenId}
          role={role}
          motion={motion}
          testID={getSocialV1HotTokenChipTestId(chipId)}
          closeTestID={getSocialV1HotTokenCloseTestId(chipId)}
        />
      );
    })}
  </Box>
);

/**
 * HotTokensCarousel -- the rail of asset chips above the Social V1 feed. When
 * the chips overflow the viewport they crawl like a news ticker, until a chip is
 * selected: that chip slides to the left edge while the others fade, then the
 * rail holds still with a close action. Closing it slides the chip back and
 * fades the rest in.
 *
 * The crawl is a `translateX` on the track, not `ScrollView.scrollTo`. A
 * gesture-handler ScrollView that `scrollTo`s every frame keeps a native
 * scroll gesture alive on PagerView page 0 and cancels taps on the rest of
 * Trending (reactions, overflow menu, Popular traders). A pan on this rail
 * still wins over the pager so scrubbing the chips does not change tabs.
 *
 * The crawl runs a callback every frame, so low-end hardware keeps the rail
 * still. The pan stays, so the chips can still be scrubbed.
 *
 * Icons go through `PositionTokenAvatar`, the same resolution the position
 * cards use.
 */
const HotTokensCarousel: React.FC<HotTokensCarouselProps> = ({
  tokens = EMPTY_TOKENS,
  isLoading = false,
  selectedTokenId = null,
  onTokenPress,
  isActive = true,
}) => {
  const [isLowHardware] = useState(() => getHardwareTier() === 'LOW');
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
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<RestingPhase>(
    selectedTokenId ? 'parked' : 'browse',
  );
  const [flight, setFlight] = useState<ChipFlight | null>(null);
  const isParkedAtRest = !flight && phase === 'parked';
  // Frequency order while browsing or mid-flight. Once the move finishes, the
  // selected chip is the only one left, parked at the left edge.
  const railTokens = useMemo(
    () => (isParkedAtRest && selectedToken ? [selectedToken] : tokens),
    [isParkedAtRest, selectedToken, tokens],
  );
  const offset = useSharedValue(0);
  const dragStartOffset = useSharedValue(0);
  const paused = useSharedValue(false);
  const trackWidthSv = useSharedValue(0);
  const viewportWidthSv = useSharedValue(0);
  const progressSv = useSharedValue(selectedTokenId ? 1 : 0);
  const travelerShiftSv = useSharedValue(0);
  // Holds the crawl and the pan from the first frame of a selection until the
  // rail is browsing again.
  const parked = useSharedValue(Boolean(selectedTokenId));
  const [trackWidth, setTrackWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const tokensRef = useRef(tokens);
  const trackWidthRef = useRef(0);
  const viewportWidthRef = useRef(0);
  const flightRef = useRef(flight);
  const generationRef = useRef(0);
  const lastSelectedRef = useRef(selectedTokenId);
  const collapseStartOffsetRef = useRef(0);
  const layoutsRef = useRef<Record<string, ChipLayout>>({});
  const homeLayoutsRef = useRef<Record<string, ChipLayout>>({});
  const finishFlightRef = useRef<
    (generation: number, destination: RestingPhase) => void
  >(() => undefined);
  tokensRef.current = tokens;
  trackWidthRef.current = trackWidth;
  flightRef.current = flight;

  const motion = useMemo<RailMotionValues>(
    () => ({ progress: progressSv, travelerShift: travelerShiftSv }),
    [progressSv, travelerShiftSv],
  );

  const shouldMarquee =
    trackWidth > 0 && viewportWidth > 0 && trackWidth > viewportWidth;

  const finishFromUi = useCallback(
    (generation: number, destination: RestingPhase) => {
      finishFlightRef.current(generation, destination);
    },
    [],
  );

  const leadingX = useCallback(() => {
    const firstId = tokensRef.current[0]?.id;
    const measured = firstId
      ? (homeLayoutsRef.current[firstId] ?? layoutsRef.current[firstId])
      : undefined;
    return measured?.x ?? DEFAULT_LEADING_X;
  }, []);

  const trackX = useCallback((instanceId: string) => {
    const layout = layoutsRef.current[instanceId];
    if (!layout) {
      return null;
    }
    return instanceId.endsWith(LOOP_SUFFIX)
      ? trackWidthRef.current + layout.x
      : layout.x;
  }, []);

  /** Where an expanding chip lands, and whether the track has to scroll to it. */
  const planExpand = useCallback(
    (home: ChipLayout | undefined) => {
      const leading = leadingX();
      if (!home) {
        return { shift: 0, trackTarget: 0 };
      }
      const viewport = viewportWidthRef.current;
      const fitsInView = viewport <= 0 || home.x + home.width <= viewport;
      return {
        shift: leading - home.x,
        trackTarget: fitsInView ? 0 : home.x - leading,
      };
    },
    [leadingX],
  );

  const finishFlight = useCallback(
    (generation: number, destination: RestingPhase) => {
      if (generation !== generationRef.current) {
        return;
      }
      if (destination === 'browse') {
        parked.value = false;
      }
      setFlight(null);
      setPhase(destination);
    },
    [parked],
  );
  finishFlightRef.current = finishFlight;

  const startCollapse = useCallback(
    (instanceId: string, tokenId: string) => {
      generationRef.current += 1;
      lastSelectedRef.current = tokenId;
      const current = flightRef.current;
      if (current?.kind === 'expand' && current.travelerId === instanceId) {
        setFlight({
          ...current,
          kind: 'collapse',
          generation: generationRef.current,
          reverse: true,
        });
        return;
      }
      const origin = trackX(instanceId);
      collapseStartOffsetRef.current = offset.value;
      // Resting chips ignore these until React marks this one as the traveler.
      travelerShiftSv.value = origin == null ? 0 : leadingX() - origin;
      progressSv.value = 0;
      parked.value = true;
      setFlight({
        kind: 'collapse',
        travelerId: instanceId,
        generation: generationRef.current,
        reverse: false,
        trackTarget: 0,
      });
    },
    [leadingX, offset, parked, progressSv, trackX, travelerShiftSv],
  );

  const startExpand = useCallback(
    (tokenId: string) => {
      generationRef.current += 1;
      lastSelectedRef.current = null;
      const current = flightRef.current;
      if (current?.kind === 'collapse') {
        setFlight({
          ...current,
          kind: 'expand',
          generation: generationRef.current,
          reverse: true,
        });
        return;
      }
      const { shift, trackTarget } = planExpand(
        homeLayoutsRef.current[tokenId],
      );
      // At progress 1 this holds the chip on the parked spot, so the first
      // frame with the full rail matches the last frame of the parked one.
      travelerShiftSv.value = shift;
      progressSv.value = 1;
      parked.value = true;
      setFlight({
        kind: 'expand',
        travelerId: tokenId,
        generation: generationRef.current,
        reverse: false,
        trackTarget,
      });
    },
    [parked, planExpand, progressSv, travelerShiftSv],
  );

  const settle = useCallback(
    (nextSelectedId: string | null) => {
      generationRef.current += 1;
      lastSelectedRef.current = nextSelectedId;
      progressSv.value = nextSelectedId ? 1 : 0;
      parked.value = Boolean(nextSelectedId);
      if (nextSelectedId) {
        offset.value = 0;
      }
      setFlight(null);
      setPhase(nextSelectedId ? 'parked' : 'browse');
    },
    [offset, parked, progressSv],
  );

  // Starts the motion once React has committed the rail it animates.
  useLayoutEffect(() => {
    if (!flight) {
      return;
    }
    const { generation } = flight;
    const onDone = (destination: RestingPhase) => (finished?: boolean) => {
      'worklet';
      if (finished) {
        scheduleOnRN(finishFromUi, generation, destination);
      }
    };
    if (flight.kind === 'collapse') {
      offset.value = withTiming(0, CHIP_MOTION);
      progressSv.value = withTiming(1, CHIP_MOTION, onDone('parked'));
      return;
    }
    if (flight.reverse) {
      offset.value = withTiming(collapseStartOffsetRef.current, CHIP_MOTION);
    } else if (flight.trackTarget > 0) {
      // The track scrolls by what the chip would travel, so the chip holds
      // still on screen while its neighbors fade in around it.
      offset.value = withTiming(flight.trackTarget, CHIP_MOTION);
    }
    progressSv.value = withTiming(0, CHIP_MOTION, onDone('browse'));
  }, [finishFromUi, flight, offset, progressSv]);

  // Selection changes that did not come from a tap on this rail.
  useLayoutEffect(() => {
    if (lastSelectedRef.current === selectedTokenId) {
      return;
    }
    const previousId = lastSelectedRef.current;
    if (reduceMotion || (selectedTokenId && previousId)) {
      settle(selectedTokenId);
      return;
    }
    if (selectedTokenId) {
      startCollapse(selectedTokenId, selectedTokenId);
      return;
    }
    if (previousId) {
      startExpand(previousId);
    }
  }, [reduceMotion, selectedTokenId, settle, startCollapse, startExpand]);

  useEffect(
    () => () => {
      generationRef.current += 1;
    },
    [],
  );

  const handleViewportLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      viewportWidthSv.value = width;
      viewportWidthRef.current = width;
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
          if (parked.value) {
            return;
          }
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
    [dragStartOffset, offset, parked, paused, trackWidthSv],
  );

  const tickMarquee = useCallback(
    (frame: { timeSincePreviousFrame: number | null }) => {
      'worklet';
      const width = trackWidthSv.value;
      const viewport = viewportWidthSv.value;
      if (
        parked.value ||
        paused.value ||
        width <= 0 ||
        viewport <= 0 ||
        width <= viewport
      ) {
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
    [offset, parked, paused, trackWidthSv, viewportWidthSv],
  );

  const marqueeFrameCallback = useFrameCallback(tickMarquee, false);

  useEffect(() => {
    marqueeFrameCallback.setActive(isActive && !isLowHardware);
  }, [isActive, isLowHardware, marqueeFrameCallback]);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -offset.value }],
  }));

  const loopTokens = useMemo(
    () => (shouldMarquee && !isParkedAtRest ? railTokens : []),
    [isParkedAtRest, railTokens, shouldMarquee],
  );

  const handleChipLayout = useCallback(
    (instanceId: string, layout: ChipLayout) => {
      layoutsRef.current[instanceId] = layout;
      const current = flightRef.current;
      if (instanceId.endsWith(LOOP_SUFFIX)) {
        return;
      }
      if (!current && phase === 'browse') {
        homeLayoutsRef.current[instanceId] = layout;
        return;
      }
      // The ranking can reorder while a chip is parked. Re-aim the chip at
      // the slot it actually landed in rather than the one it left.
      if (
        current?.kind === 'expand' &&
        !current.reverse &&
        current.travelerId === instanceId &&
        homeLayoutsRef.current[instanceId]?.x !== layout.x
      ) {
        homeLayoutsRef.current[instanceId] = layout;
        const { shift, trackTarget } = planExpand(layout);
        travelerShiftSv.value = shift;
        if (trackTarget > 0) {
          offset.value = withTiming(trackTarget, CHIP_MOTION);
        }
      }
    },
    [offset, phase, planExpand, travelerShiftSv],
  );

  const handleChipPress = useCallback(
    (token: SocialV1HotToken, instanceId: string) => {
      if (!onTokenPress) {
        return;
      }
      playSelection().catch(() => undefined);
      if (!reduceMotion) {
        if (token.id === selectedTokenId) {
          startExpand(token.id);
        } else if (!selectedTokenId) {
          startCollapse(instanceId, token.id);
        } else {
          settle(token.id);
        }
      }
      onTokenPress(token);
    },
    [
      onTokenPress,
      reduceMotion,
      selectedTokenId,
      settle,
      startCollapse,
      startExpand,
    ],
  );

  // Returning null instead of an empty wrapper lets the page's gap collapse,
  // rather than leaving a rail-shaped hole above the first post.
  if (!isLoading && railTokens.length === 0) {
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
            tokens={railTokens}
            onPress={handleChipPress}
            onLayout={handleTrackLayout}
            onChipLayout={handleChipLayout}
            testID={SOCIAL_V1_HOT_TOKENS_TRACK_TEST_ID}
            selectedTokenId={selectedTokenId}
            flight={flight}
            motion={motion}
          />
          {loopTokens.length > 0 ? (
            <HotTokenTrack
              tokens={loopTokens}
              onPress={handleChipPress}
              onChipLayout={handleChipLayout}
              idSuffix={LOOP_SUFFIX}
              selectedTokenId={selectedTokenId}
              flight={flight}
              motion={motion}
            />
          ) : null}
        </Animated.View>
      </GestureDetector>
    </Box>
  );
};

export default HotTokensCarousel;
