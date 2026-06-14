import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import {
  getMedalColors,
  getPodiumRankIndicatorStyle,
  isTopRank,
} from './topRank.colors';

interface TopRankIndicatorProps {
  /** The rank digit to display in the cell (e.g. position within a filter). */
  rank: number;
  /**
   * Optional gating rank used to decide whether podium styling applies.
   * Defaults to `rank`. Pass the trader's overall (unfiltered) rank when the
   * displayed rank is a filtered position so the gold/silver/bronze treatment
   * only fires for true top-3 traders.
   */
  podiumRank?: number;
}

/**
 * Renders the rank cell for a `TraderRow`. For podium ranks (1–3), the digit
 * is rendered bold and tinted with the matching medal color so it visually
 * echoes the avatar's gradient ring. For other ranks it renders as the
 * secondary (muted) body text so podium ranks read as the focal ranks.
 */
const TopRankIndicator: React.FC<TopRankIndicatorProps> = ({
  rank,
  podiumRank = rank,
}) => {
  if (isTopRank(podiumRank)) {
    const colors = getMedalColors(podiumRank);
    return (
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        numberOfLines={1}
        twClassName="w-8 text-right"
        style={
          colors ? getPodiumRankIndicatorStyle(colors.rankDigit) : undefined
        }
        testID={`top-rank-medal-color-${podiumRank}`}
      >
        {rank}
      </Text>
    );
  }

  return (
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
      numberOfLines={1}
      twClassName="w-8 text-right"
    >
      {rank}
    </Text>
  );
};

export default TopRankIndicator;
