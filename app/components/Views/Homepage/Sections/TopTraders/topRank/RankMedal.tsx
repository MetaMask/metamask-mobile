import React from 'react';
import { Image } from 'expo-image';
import RankBadge1 from './assets/rank-badge-1.png';
import RankBadge2 from './assets/rank-badge-2.png';
import RankBadge3 from './assets/rank-badge-3.png';
import { getRankMedalTestId } from './RankMedal.testIds';

/** Whether `rank` is a podium position (1, 2 or 3). */
export const isTopRank = (rank: number): boolean => rank >= 1 && rank <= 3;

/**
 * RankMedal — the leaderboard podium badge for ranks 1–3.
 *
 * The rank numeral is baked into the asset. Ranks outside 1–3 render nothing.
 * The badge is square so it shares the 24px rank slot used by the numeric
 * ranks below it.
 */

const MEDAL_SIZE = 24;

const BADGE_BY_RANK = {
  1: RankBadge1,
  2: RankBadge2,
  3: RankBadge3,
} as const;

export interface RankMedalProps {
  /** Podium rank; only 1, 2 and 3 render a medal. */
  rank: number;
  /**
   * Rendered edge length in px. Defaults to 24 so the medal matches the
   * numeric rank slot.
   */
  size?: number;
  testID?: string;
}

const RankMedal: React.FC<RankMedalProps> = ({
  rank,
  size = MEDAL_SIZE,
  testID,
}) => {
  if (!isTopRank(rank)) {
    return null;
  }

  const source = BADGE_BY_RANK[rank as 1 | 2 | 3];

  return (
    <Image
      accessible
      accessibilityLabel={String(rank)}
      contentFit="contain"
      source={source}
      style={{ width: size, height: size }}
      testID={testID ?? getRankMedalTestId(rank)}
    />
  );
};

export default RankMedal;
