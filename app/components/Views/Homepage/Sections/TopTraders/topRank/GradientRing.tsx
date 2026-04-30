import React from 'react';
import { View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { getMedalColors } from './topRank.colors';

interface GradientRingProps {
  rank: number;
  children: React.ReactNode;
}

const RING_WIDTH = 4;
const AVATAR_SIZE = 40;
const OUTER_SIZE = AVATAR_SIZE + RING_WIDTH * 2;
const INSET = -RING_WIDTH;
const OUTER_RADIUS = OUTER_SIZE / 2;

// Narrow diagonal sheen band rendered on top of the base gradient. The
// transparent → bright-white → transparent ramp simulates a polished-metal
// specular highlight; running it perpendicular to the base gradient maximises
// the cross-pattern that reads as "shiny chrome".
const SHEEN_COLORS = [
  'rgba(255, 255, 255, 0)',
  'rgba(255, 255, 255, 0.65)',
  'rgba(255, 255, 255, 0)',
] as const;
const SHEEN_LOCATIONS = [0.38, 0.5, 0.62] as const;

/**
 * Chrome-like multi-stop gradient ring with a perpendicular specular sheen
 * overlay for a polished-metal look around an avatar.
 *
 * The wrapper keeps the avatar's exact 40x40 footprint so the row's flex
 * layout is identical to a non-podium row (no horizontal shift). The
 * gradient (and its sheen overlay) bleeds 4px outside the footprint on every
 * side, with the avatar (an opaque round image) sitting on top to mask the
 * center, leaving only the visible ring.
 */
const GradientRing: React.FC<GradientRingProps> = ({ rank, children }) => {
  const colors = getMedalColors(rank);

  if (!colors) {
    return <>{children}</>;
  }

  const ringStyle = {
    position: 'absolute' as const,
    top: INSET,
    left: INSET,
    right: INSET,
    bottom: INSET,
    borderRadius: OUTER_RADIUS,
  };

  return (
    <View
      style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
      testID={`top-rank-gradient-ring-${rank}`}
    >
      <LinearGradient
        colors={[...colors.gradient]}
        locations={[...colors.gradientLocations]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={ringStyle}
      />
      <LinearGradient
        colors={[...SHEEN_COLORS]}
        locations={[...SHEEN_LOCATIONS]}
        // Perpendicular to the base gradient so the sheen crosses the ring
        // and reads as a moving specular highlight.
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={ringStyle}
        pointerEvents="none"
      />
      {children}
    </View>
  );
};

export default GradientRing;
