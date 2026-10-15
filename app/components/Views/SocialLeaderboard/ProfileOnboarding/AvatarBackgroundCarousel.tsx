import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useState } from 'react';
import { Pressable, type LayoutChangeEvent } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { strings } from '../../../../../locales/i18n';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useHaptics } from '../../../../util/haptics';
import {
  getProfileAvatarPreset,
  PROFILE_AVATAR_BACKGROUNDS,
} from '../MyProfileView/avatarPresets';
import { ProfileAvatarArt } from '../MyProfileView/components/ProfileAvatar';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';

/** Diameter of the colors either side of the selection. */
const SWATCH_SIZE = 84;
/** Diameter of the selected color under the avatar. */
const SELECTED_SIZE = 120;
/** Center-to-center distance between swatches; also the snap interval. */
const SLOT_WIDTH = 132;
/** Leaves a 2pt see-through gap between the selected color and the ring. */
const SOLID_RING_SIZE = SELECTED_SIZE + 8;
const DOTTED_RING_SIZE = SOLID_RING_SIZE + 22;
const RING_SIZE = DOTTED_RING_SIZE + 4;
const ART_SIZE = SELECTED_SIZE * 0.72;
const SELECTED_SCALE = SELECTED_SIZE / SWATCH_SIZE;
const LAST_INDEX = PROFILE_AVATAR_BACKGROUNDS.length - 1;

const clampIndex = (index: number) => {
  'worklet';
  return Math.min(Math.max(index, 0), LAST_INDEX);
};

interface SwatchProps {
  index: number;
  color: string;
  label: string;
  isSelected: boolean;
  scrollX: SharedValue<number>;
  interpolateScale: boolean;
  onPress: (index: number) => void;
}

const Swatch: React.FC<SwatchProps> = ({
  index,
  color,
  label,
  isSelected,
  scrollX,
  interpolateScale,
  onPress,
}) => {
  const tw = useTailwind();
  const animatedStyle = useAnimatedStyle(() => {
    const position = scrollX.value / SLOT_WIDTH;
    const scale = interpolateScale
      ? interpolate(
          position,
          [index - 1, index, index + 1],
          [1, SELECTED_SCALE, 1],
          'clamp',
        )
      : Math.round(position) === index
        ? SELECTED_SCALE
        : 1;
    return { transform: [{ scale }] };
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected }}
      onPress={() => onPress(index)}
      testID={`${SocialProfileOnboardingSelectorsIDs.AVATAR_BACKGROUND_OPTION}-${index}`}
      style={tw.style('items-center justify-center', {
        width: SLOT_WIDTH,
        height: RING_SIZE,
      })}
    >
      <Animated.View
        style={[
          tw.style('rounded-full', {
            width: SWATCH_SIZE,
            height: SWATCH_SIZE,
            backgroundColor: color,
          }),
          animatedStyle,
        ]}
      />
    </Pressable>
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
 */
const AvatarBackgroundCarousel: React.FC<AvatarBackgroundCarouselProps> = ({
  avatarPresetId,
  selectedBackgroundId,
  onSelect,
}) => {
  const tw = useTailwind();
  const { playSelection } = useHaptics();
  const [width, setWidth] = useState(0);
  // Frozen at mount: a changing `contentOffset` re-positions the native
  // scroll view and cuts off an in-flight snap.
  const [initialIndex] = useState(() =>
    Math.max(
      PROFILE_AVATAR_BACKGROUNDS.findIndex(
        (background) => background.id === selectedBackgroundId,
      ),
      0,
    ),
  );
  const scrollX = useSharedValue(initialIndex * SLOT_WIDTH);
  /** Last color a snap came to rest on; a haptic plays when it changes. */
  const settledIndex = useSharedValue(initialIndex);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const interpolateScale = getHardwareTier() !== 'LOW';
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

  const handleSwatchPress = useCallback(
    (index: number) => {
      if (index !== settledIndex.value) {
        settledIndex.value = index;
        playSnapHaptic();
      }
      selectIndex(index);
      scrollRef.current?.scrollTo({ x: index * SLOT_WIDTH, animated: true });
    },
    [playSnapHaptic, scrollRef, selectIndex, settledIndex],
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
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
      style={tw.style({ height: RING_SIZE })}
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
          contentOffset={{ x: initialIndex * SLOT_WIDTH, y: 0 }}
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
              interpolateScale={interpolateScale}
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
        <Box
          twClassName="absolute rounded-full border-2 border-icon-default"
          style={tw.style({ width: SOLID_RING_SIZE, height: SOLID_RING_SIZE })}
        />
        <Box
          twClassName="absolute rounded-full border-2 border-icon-muted"
          style={tw.style({
            width: DOTTED_RING_SIZE,
            height: DOTTED_RING_SIZE,
            borderStyle: 'dotted',
          })}
        />
        <ProfileAvatarArt preset={preset} sizePx={ART_SIZE} />
      </Box>
    </Box>
  );
};

export default AvatarBackgroundCarousel;
