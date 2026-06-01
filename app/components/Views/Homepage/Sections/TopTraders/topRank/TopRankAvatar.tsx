import React from 'react';
import GradientRing from './GradientRing';
import CrownEmoji from './CrownEmoji';
import { isTopRank } from './topRank.colors';

interface TopRankAvatarProps {
  /**
   * Rank used to decide whether to decorate the avatar. Pass the trader's
   * overall (unfiltered) rank so the gold/silver/bronze treatment only fires
   * for true top-3 traders.
   */
  rank: number;
  children: React.ReactNode;
}

/**
 * Wraps an avatar with the top-rank decoration for podium ranks (1–3): a
 * chrome gradient ring around the avatar plus a floating crown / medal emoji
 * above its top-right corner.
 *
 * For ranks > 3, `children` is rendered unchanged.
 */
const TopRankAvatar: React.FC<TopRankAvatarProps> = ({ rank, children }) => {
  if (!isTopRank(rank)) {
    return <>{children}</>;
  }

  return (
    <CrownEmoji rank={rank}>
      <GradientRing rank={rank}>{children}</GradientRing>
    </CrownEmoji>
  );
};

export default TopRankAvatar;
