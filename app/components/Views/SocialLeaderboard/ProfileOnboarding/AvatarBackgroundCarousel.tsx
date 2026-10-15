import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  scrollTo,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, FeGaussianBlur, Filter, G } from 'react-native-svg';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { strings } from '../../../../../locales/i18n';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useHaptics } from '../../../../util/haptics';
import {
  getProfileAvatarPreset,
  PROFILE_AVATAR_BACKGROUNDS,
} from '../MyProfileView/avatarPresets';
import { ProfileAvatarArt } from '../MyProfileView/components/ProfileAvatar';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Diameter of the selected color under the avatar. */
const SELECTED_SIZE = 102;
/** Scroll distance between two colors; also the snap interval. */
const SLOT_WIDTH = 114;

/**
 * Layout by distance from the center, in slots. Neighbors keep a 16pt gap
 * while shrinking, so their centers are not evenly spaced.
 */
const DISTANCE_STEPS = [0, 1, 2, 3, 4];
const OFFSETS = [0, 114, 190, 246, 286];
const SIZES = [SELECTED_SIZE, 72, 48, 32, 24];
const OPACITIES = [1, 1, 1, 0.25, 0];

/** 1pt solid ring flush against the selected color. */
const SOLID_RING_SIZE = SELECTED_SIZE + 2;
const DOTTED_RING_SIZE = 124;
const DOTTED_RING_STROKE = 1.38;
const DOTTED_RING_DASH = '1.38 4.15';
const STRIP_HEIGHT = DOTTED_RING_SIZE + 2;
const ART_SIZE = SELECTED_SIZE * 0.85;
const LAST_INDEX = PROFILE_AVATAR_BACKGROUNDS.length - 1;

/** The blurred copy behind the avatar is drawn this much larger. */
const GLOW_SCALE = 1.2;
const GLOW_BLUR = 14;
const GLOW_CENTER = SELECTED_SIZE / 2;

const GLIDE_EASING = Easing.inOut(Easing.cubic);
const INTRO_GLIDE_MS = 660;
const MIN_GLIDE_MS = 280;
const MAX_GLIDE_MS = 520;
const GLIDE_MS_PER_EXTRA_STEP = 120;

const clampIndex = (index: number) => {
  'worklet';
  return Math.min(Math.max(index, 0), LAST_INDEX);
};

/** Signed horizontal offset from the center for a slot distance. */
const offsetAt = (distance: number) => {
  'worklet';
  const magnitude = interpolate(
    Math.abs(distance),
    DISTANCE_STEPS,
    OFFSETS,
    'extend',
  );
  return distance < 0 ? -magnitude : magnitude;
};

const sizeAt = (distance: number) => {
  'worklet';
  return interpolate(Math.abs(distance), DISTANCE_STEPS, SIZES, 'clamp');
};

const opacityAt = (distance: number) => {
  'worklet';
  return interpolate(Math.abs(distance), DISTANCE_STEPS, OPACITIES, 'clamp');
};

const glideDuration = (steps: number) =>
  Math.min(
    MIN_GLIDE_MS + Math.max(steps - 1, 0) * GLIDE_MS_PER_EXTRA_STEP,
    MAX_GLIDE_MS,
  );

interface SwatchProps {
  index: number;
  color: string;
  label: string;
  isSelected: boolean;
  scrollX: SharedValue<number>;
  onPress: (index: number) => void;
}

/**
 * One color. It sits in an evenly spaced scroll slot so native scrolling and
 * snapping work, then a transform moves and scales it into the center-weighted
 * layout. The tap target follows the transform.
 */
const Swatch: React.FC<SwatchProps> = ({
  index,
  color,
  label,
  isSelected,
  scrollX,
  onPress,
}) => {
  const tw = useTailwind();
  const animatedStyle = useAnimatedStyle(() => {
    const distance = index - scrollX.value / SLOT_WIDTH;
    return {
      opacity: opacityAt(distance),
      transform: [
        { translateX: offsetAt(distance) - distance * SLOT_WIDTH },
        { scale: sizeAt(distance) / SELECTED_SIZE },
      ],
    };
  });

  return (
    <Box
      twClassName="items-center justify-center"
      style={{ width: SLOT_WIDTH, height: STRIP_HEIGHT }}
    >
      <Animated.View
        style={[{ width: SELECTED_SIZE, height: SELECTED_SIZE }, animatedStyle]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected: isSelected }}
          onPress={() => onPress(index)}
          testID={`${SocialProfileOnboardingSelectorsIDs.AVATAR_BACKGROUND_OPTION}-${index}`}
          style={tw.style('flex-1 rounded-full', { backgroundColor: color })}
        />
      </Animated.View>
    </Box>
  );
};

interface GlowCircleProps {
  index: number;
  color: string;
  scrollX: SharedValue<number>;
}

/** Enlarged copy of one swatch, tracking the strip from inside the preview. */
const GlowCircle: React.FC<GlowCircleProps> = ({ index, color, scrollX }) => {
  const animatedProps = useAnimatedProps(() => {
    const distance = index - scrollX.value / SLOT_WIDTH;
    return {
      cx: GLOW_CENTER + offsetAt(distance) * GLOW_SCALE,
      r: (sizeAt(distance) / 2) * GLOW_SCALE,
      opacity: opacityAt(distance),
    };
  });

  return (
    <AnimatedCircle
      cy={GLOW_CENTER}
      fill={color}
      animatedProps={animatedProps}
    />
  );
};

/**
 * Blurred colors behind the avatar. As neighbors slide past one another their
 * blurred edges overlap, which reads as a soft gradient between the two.
 */
const AvatarGlow: React.FC<{ scrollX: SharedValue<number> }> = ({
  scrollX,
}) => (
  <Box
    twClassName="absolute rounded-full overflow-hidden bg-default"
    style={{ width: SELECTED_SIZE, height: SELECTED_SIZE }}
    testID={SocialProfileOnboardingSelectorsIDs.AVATAR_BACKGROUND_GLOW}
  >
    <Svg width={SELECTED_SIZE} height={SELECTED_SIZE}>
      <Defs>
        <Filter
          id="avatarBackgroundGlow"
          filterUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={SELECTED_SIZE}
          height={SELECTED_SIZE}
        >
          <FeGaussianBlur stdDeviation={GLOW_BLUR} />
        </Filter>
      </Defs>
      <G filter="url(#avatarBackgroundGlow)">
        {PROFILE_AVATAR_BACKGROUNDS.map((background, index) => (
          <GlowCircle
            key={background.id}
            index={index}
            color={background.color}
            scrollX={scrollX}
          />
        ))}
      </G>
    </Svg>
  </Box>
);

/** Ring of small round dots around the selection. */
const DottedRing: React.FC = () => {
  const tw = useTailwind();
  const radius = (DOTTED_RING_SIZE - DOTTED_RING_STROKE) / 2;
  return (
    <Box twClassName="absolute">
      <Svg width={DOTTED_RING_SIZE} height={DOTTED_RING_SIZE}>
        <Circle
          cx={DOTTED_RING_SIZE / 2}
          cy={DOTTED_RING_SIZE / 2}
          r={radius}
          stroke={tw.color('icon-default')}
          strokeOpacity={0.25}
          strokeWidth={DOTTED_RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={DOTTED_RING_DASH}
          fill="none"
        />
      </Svg>
    </Box>
  );
};

interface AvatarBackgroundCarouselProps {
  avatarPresetId: string;
  selectedBackgroundId: string;
  onSelect: (backgroundId: string) => void;
}

/**
 * Horizontal strip of backdrop colors that snaps one color under a fixed
 * avatar. Selection follows whichever color is centered, so it updates while
 * the user swipes as well as when they tap a neighbor.
 *
 * Finger swipes use native scrolling and snapping. The entrance and taps glide
 * with an ease-in-out cubic curve driven from the UI thread. Low-tier devices
 * skip the entrance glide and the blurred glow.
 */
const AvatarBackgroundCarousel: React.FC<AvatarBackgroundCarouselProps> = ({
  avatarPresetId,
  selectedBackgroundId,
  onSelect,
}) => {
  const tw = useTailwind();
  const { playSelection } = useHaptics();
  const [width, setWidth] = useState(0);
  const isLowTier = getHardwareTier() === 'LOW';
  // Frozen at mount: a changing `contentOffset` re-positions the native
  // scroll view and cuts off an in-flight snap.
  const [targetIndex] = useState(() =>
    Math.max(
      PROFILE_AVATAR_BACKGROUNDS.findIndex(
        (background) => background.id === selectedBackgroundId,
      ),
      0,
    ),
  );
  // The entrance glides in from the first color; low-tier devices start
  // on the selection instead.
  const startIndex = isLowTier ? targetIndex : 0;
  const scrollX = useSharedValue(startIndex * SLOT_WIDTH);
  const glideX = useSharedValue(startIndex * SLOT_WIDTH);
  const isGliding = useSharedValue(false);
  /** Last color a snap came to rest on; a haptic plays when it changes. */
  const settledIndex = useSharedValue(targetIndex);
  const hasPlayedIntro = useRef(isLowTier);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const preset = getProfileAvatarPreset(avatarPresetId);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  const selectIndex = useCallback(
    (index: number) => {
      onSelect(PROFILE_AVATAR_BACKGROUNDS[index].id);
    },
    [onSelect],
  );

  const playSnapHaptic = useCallback(() => {
    playSelection().catch(() => undefined);
  }, [playSelection]);

  const glideTo = useCallback(
    (index: number, duration: number) => {
      scheduleOnUI(() => {
        'worklet';
        cancelAnimation(glideX);
        glideX.value = scrollX.value;
        isGliding.value = true;
        glideX.value = withTiming(
          index * SLOT_WIDTH,
          { duration, easing: GLIDE_EASING },
          (finished) => {
            if (finished) {
              isGliding.value = false;
            }
          },
        );
      });
    },
    [glideX, isGliding, scrollX],
  );

  useAnimatedReaction(
    () => glideX.value,
    (x) => {
      if (isGliding.value) {
        scrollTo(scrollRef, x, 0, false);
      }
    },
  );

  useEffect(() => {
    if (width === 0 || hasPlayedIntro.current) {
      return;
    }
    hasPlayedIntro.current = true;
    glideTo(targetIndex, INTRO_GLIDE_MS);
  }, [glideTo, targetIndex, width]);

  const handleSwatchPress = useCallback(
    (index: number) => {
      const steps = Math.abs(index - settledIndex.value);
      if (steps > 0) {
        settledIndex.value = index;
        playSnapHaptic();
      }
      selectIndex(index);
      glideTo(index, glideDuration(steps));
    },
    [glideTo, playSnapHaptic, selectIndex, settledIndex],
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
    onBeginDrag: () => {
      cancelAnimation(glideX);
      isGliding.value = false;
    },
    onMomentumEnd: (event) => {
      const index = clampIndex(Math.round(event.contentOffset.x / SLOT_WIDTH));
      if (index !== settledIndex.value) {
        settledIndex.value = index;
        scheduleOnRN(playSnapHaptic);
      }
    },
  });

  useAnimatedReaction(
    () => clampIndex(Math.round(scrollX.value / SLOT_WIDTH)),
    (index, previous) => {
      if (previous !== null && index !== previous) {
        scheduleOnRN(selectIndex, index);
      }
    },
  );

  const sidePadding = Math.max((width - SLOT_WIDTH) / 2, 0);

  return (
    <Box
      twClassName="self-stretch -mx-4 justify-center"
      style={tw.style({ height: STRIP_HEIGHT })}
      onLayout={handleLayout}
      testID={SocialProfileOnboardingSelectorsIDs.AVATAR_BACKGROUND_CAROUSEL}
    >
      {width > 0 ? (
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={SLOT_WIDTH}
          decelerationRate="fast"
          disableIntervalMomentum
          contentOffset={{ x: startIndex * SLOT_WIDTH, y: 0 }}
          contentContainerStyle={tw.style({ paddingHorizontal: sidePadding })}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        >
          {PROFILE_AVATAR_BACKGROUNDS.map((background, index) => (
            <Swatch
              key={background.id}
              index={index}
              color={background.color}
              label={strings(
                `social_leaderboard.profile_onboarding.avatar_background_${background.id}`,
              )}
              isSelected={background.id === selectedBackgroundId}
              scrollX={scrollX}
              onPress={handleSwatchPress}
            />
          ))}
        </Animated.ScrollView>
      ) : null}
      <Box
        pointerEvents="none"
        twClassName="absolute inset-0 items-center justify-center"
        testID={SocialProfileOnboardingSelectorsIDs.AVATAR_PREVIEW}
      >
        {isLowTier ? null : <AvatarGlow scrollX={scrollX} />}
        <Box
          twClassName="absolute rounded-full border border-icon-default"
          style={tw.style({ width: SOLID_RING_SIZE, height: SOLID_RING_SIZE })}
        />
        <DottedRing />
        <ProfileAvatarArt preset={preset} sizePx={ART_SIZE} />
      </Box>
    </Box>
  );
};

export default AvatarBackgroundCarousel;
