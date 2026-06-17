import React from 'react';
import type { SvgProps } from 'react-native-svg';
import RankBadge1 from './assets/rank-badge-1.svg';
import RankBadge2 from './assets/rank-badge-2.svg';
import RankBadge3 from './assets/rank-badge-3.svg';

type SvgComponent = React.FC<SvgProps & { name: string }>;

/** Whether `rank` is a podium position (1, 2 or 3). */
export const isTopRank = (rank: number): boolean => rank >= 1 && rank <= 3;

/**
 * RankMedal — the leaderboard podium badge (medallion + ribbon + rank numeral)
 * for ranks 1–3.
 *
 * Renders the exact Figma exports (nodes `2521:11941/11960/11978`): the medal
 * shape, the baked-in rank number, and the 2px backing border are all part of
 * the vector. Ranks outside 1–3 render nothing.
 */

// Source artboard for a single medal export. It is 24x30 because the 2px
// border wraps the 20x26 medallion on every side, so rendering at the natural
// artboard size displays the medallion at its intended 20x26.
const VIEW_BOX_WIDTH = 24;
const VIEW_BOX_HEIGHT = 30;
const ASPECT_RATIO = VIEW_BOX_WIDTH / VIEW_BOX_HEIGHT;

const BADGE_BY_RANK: Record<1 | 2 | 3, SvgComponent> = {
  1: RankBadge1,
  2: RankBadge2,
  3: RankBadge3,
};

export interface RankMedalProps {
  /** Podium rank; only 1, 2 and 3 render a medal. */
  rank: number;
  /**
   * Rendered height in px; width is derived from the medal aspect ratio.
   * Defaults to the export artboard height so the medallion renders at 20x26.
   */
  size?: number;
  testID?: string;
}

const RankMedal: React.FC<RankMedalProps> = ({
  rank,
  size = VIEW_BOX_HEIGHT,
  testID,
}) => {
  if (!isTopRank(rank)) {
    return null;
  }

  const Badge = BADGE_BY_RANK[rank as 1 | 2 | 3];
  const width = size * ASPECT_RATIO;

  return (
    <Badge
      name={`rank-medal-${rank}`}
      testID={testID ?? `rank-medal-${rank}`}
      width={width}
      height={size}
    />
  );
};

export default RankMedal;
