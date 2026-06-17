import React from 'react';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import {
  getRankMedalColors,
  RANK_MEDAL_BACKING,
  RANK_MEDAL_OUTLINE,
} from './topRank.colors';

/**
 * RankMedal — the leaderboard podium badge (medallion + ribbon) for ranks 1–3.
 *
 * Replaces the previous crown emoji + gradient ring. Geometry is transcribed
 * verbatim from Figma nodes `2521:11941/11960/11978`; the source layers are
 * authored with the disc on top and a `rotate(180)` applied in layout, so the
 * medal group is rotated 180° about the artboard center here while the rank
 * numeral is drawn upright on top of the (now bottom) medallion.
 */

// Figma source artboard for a single medal.
const VIEW_BOX_WIDTH = 24;
const VIEW_BOX_HEIGHT = 29.4541;
const ASPECT_RATIO = VIEW_BOX_WIDTH / VIEW_BOX_HEIGHT;

// Dark backing/outline shape (medallion + ribbon body) — shared by all ranks.
const MEDAL_BACKING_PATH =
  'M12 2C17.5228 2 22 6.47715 22 12C22 14.8119 20.8379 17.3511 18.9697 19.168V25.0303C18.9697 26.369 17.8846 27.4539 16.5459 27.4541H8.06055C6.7217 27.4541 5.63672 26.3691 5.63672 25.0303V19.7148C3.41551 17.8807 2 15.1056 2 12C2 6.47715 6.47715 2 12 2ZM15.9785 21.1738C15.8113 21.2464 15.6425 21.3163 15.4707 21.3799C15.6308 21.3522 15.8011 21.2789 15.9785 21.1738Z';

// Colored ribbon + medallion fills (Figma "Vector"), inset +2 inside the backing.
const RIBBON_BODY_PATH =
  'M3.63636 16.9697C3.63636 16.3636 7.27273 19.431 7.27273 19.431L10 20L13.3333 19.3939C14.6722 19.3939 16.9697 15.6308 16.9697 16.9697V23.0303C16.9697 24.3692 15.8843 25.4545 14.5455 25.4545H6.06061C4.72173 25.4545 3.63636 24.3692 3.63636 23.0303V16.9697Z';
const RIBBON_HIGHLIGHT_PATH =
  'M7.27273 19.431L10 20L13.3333 19.3939V25.4545H7.27273V19.431Z';
const MEDALLION_PATH =
  'M20 10C20 15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10C0 4.47715 4.47715 0 10 0C15.5228 0 20 4.47715 20 10Z';

export interface RankMedalProps {
  /** Podium rank; only 1, 2 and 3 render a medal. */
  rank: number;
  /** Rendered height in px (width is derived from the medal aspect ratio). */
  size?: number;
  testID?: string;
}

const RankMedal: React.FC<RankMedalProps> = ({ rank, size = 22, testID }) => {
  const colors = getRankMedalColors(rank);
  if (!colors) {
    return null;
  }

  const width = size * ASPECT_RATIO;

  return (
    <Svg
      width={width}
      height={size}
      viewBox={`0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`}
      testID={testID ?? `rank-medal-${rank}`}
    >
      <G transform={`rotate(180 ${VIEW_BOX_WIDTH / 2} ${VIEW_BOX_HEIGHT / 2})`}>
        <Path
          d={MEDAL_BACKING_PATH}
          fill={RANK_MEDAL_BACKING}
          stroke={RANK_MEDAL_OUTLINE}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <G transform="translate(2 2)">
          <Path d={RIBBON_BODY_PATH} fill={colors.ribbonDark} />
          <Path d={RIBBON_HIGHLIGHT_PATH} fill={colors.ribbonLight} />
          <Path d={MEDALLION_PATH} fill={colors.medallion} />
        </G>
      </G>
      {/* Numeral drawn upright over the (post-rotation) bottom medallion. */}
      <SvgText
        x={VIEW_BOX_WIDTH / 2}
        y={21.6}
        fontSize={12}
        fontWeight="600"
        fill={RANK_MEDAL_OUTLINE}
        textAnchor="middle"
      >
        {rank}
      </SvgText>
    </Svg>
  );
};

export default RankMedal;
