import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { getHardwareTier } from '../../../../util/deviceCapability';

export const REACTION_EMOJI_BURST_TEST_ID = 'social-v1-reaction-burst';
export const REACTION_EMOJI_BURST_PARTICLE_TEST_ID =
  'social-v1-reaction-burst-particle';

const MIN_PARTICLES = 4;
const MAX_PARTICLES = 7;
const MIN_DURATION_MS = 1000;
const MAX_DURATION_MS = 1200;
const SMOOTH_OUT = Easing.out(Easing.cubic);

export interface BurstParticleSpec {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  scale: number;
  duration: number;
  delay: number;
}

/**
 * Four to seven copies. All launch on the tap frame and each picks its own
 * angle, distance, size, and short duration.
 */
export const createBurstParticles = (
  random: () => number = Math.random,
): BurstParticleSpec[] => {
  const count =
    MIN_PARTICLES + Math.floor(random() * (MAX_PARTICLES - MIN_PARTICLES + 1));

  return Array.from({ length: count }, () => {
    const startAngle = random() * Math.PI * 2;
    const startDistance = random() * 8;
    const endAngle = random() * Math.PI * 2;
    const endDistance = 20 + random() * 48;
    return {
      startX: Math.cos(startAngle) * startDistance,
      startY: Math.sin(startAngle) * startDistance,
      endX: Math.cos(endAngle) * endDistance,
      endY: Math.sin(endAngle) * endDistance,
      scale: 0.8 + random() * 0.4,
      duration:
        MIN_DURATION_MS +
        Math.floor(random() * (MAX_DURATION_MS - MIN_DURATION_MS)),
      delay: 0,
    };
  });
};

interface ReactionEmojiBurstProps {
  burstKey: number;
  emotion: string;
  /** Center of the emoji glyph, relative to the post. */
  originX: number;
  originY: number;
  onFinished: (burstKey: number) => void;
}

interface BurstParticleProps extends BurstParticleSpec {
  emotion: string;
  reportsFinish: boolean;
  onFinished?: () => void;
}

const styles = {
  origin: {
    width: 0,
    height: 0,
  },
  particle: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
  },
};

const BurstParticle: React.FC<BurstParticleProps> = ({
  emotion,
  startX,
  startY,
  endX,
  endY,
  scale,
  duration,
  reportsFinish,
  onFinished,
}) => {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);
  const halfWidth = useSharedValue(0);
  const halfHeight = useSharedValue(0);
  const alive = useRef(true);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const finish = useCallback(() => {
    if (alive.current) {
      onFinishedRef.current?.();
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    progress.value = withTiming(
      1,
      { duration, easing: SMOOTH_OUT },
      (finished) => {
        if (finished && reportsFinish) {
          scheduleOnRN(finish);
        }
      },
    );
    opacity.value = withTiming(0, {
      duration,
      easing: Easing.out(Easing.quad),
    });
  }, [duration, finish, opacity, progress, reportsFinish]);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      halfWidth.value = event.nativeEvent.layout.width / 2;
      halfHeight.value = event.nativeEvent.layout.height / 2;
    },
    [halfHeight, halfWidth],
  );

  const animatedStyle = useAnimatedStyle(() => {
    const travel = progress.value;
    return {
      opacity: halfWidth.value === 0 ? 0 : opacity.value,
      transform: [
        {
          translateX: -halfWidth.value + startX + (endX - startX) * travel,
        },
        {
          translateY: -halfHeight.value + startY + (endY - startY) * travel,
        },
        { scale },
      ],
    };
  });

  return (
    <Animated.View
      onLayout={handleLayout}
      style={[styles.particle, animatedStyle]}
      testID={REACTION_EMOJI_BURST_PARTICLE_TEST_ID}
    >
      <Text variant={TextVariant.BodyMd}>{emotion}</Text>
    </Animated.View>
  );
};

const ReactionEmojiBurst: React.FC<ReactionEmojiBurstProps> = ({
  burstKey,
  emotion,
  originX,
  originY,
  onFinished,
}) => {
  const reportFinished = useCallback(() => {
    onFinished(burstKey);
  }, [burstKey, onFinished]);
  const prefersReducedMotion = useReducedMotion();
  const particles = useRef(createBurstParticles()).current;
  const lastIndex = particles.reduce(
    (latest, particle, index, all) =>
      particle.delay + particle.duration >
      all[latest].delay + all[latest].duration
        ? index
        : latest,
    0,
  );

  // Local celebration. Offline still plays. LOW hardware skips the extra motion.
  if (prefersReducedMotion || getHardwareTier() === 'LOW') {
    return null;
  }

  return (
    <Box
      pointerEvents="none"
      twClassName="absolute overflow-visible"
      style={[styles.origin, { left: originX, top: originY }]}
      testID={REACTION_EMOJI_BURST_TEST_ID}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {particles.map((particle, index) => (
        <BurstParticle
          key={`${index}-${particle.delay}`}
          emotion={emotion}
          {...particle}
          reportsFinish={index === lastIndex}
          onFinished={reportFinished}
        />
      ))}
    </Box>
  );
};

export default ReactionEmojiBurst;
