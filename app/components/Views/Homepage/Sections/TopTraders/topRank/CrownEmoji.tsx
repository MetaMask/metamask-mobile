import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Text, View } from 'react-native';
import { isTopRank, PODIUM_EMOJI } from './topRank.colors';

interface CrownEmojiProps {
  rank: number;
  children: React.ReactNode;
}

/**
 * Floating emoji anchored above the top-right corner of the avatar (rank
 * 1 = 👑, rank 2 = 🥈, rank 3 = 🥉).
 *
 * Slight rotation makes the emoji look like it is sitting on the avatar's
 * shoulder rather than perfectly aligned, which reads better at this size.
 */
const CrownEmoji: React.FC<CrownEmojiProps> = ({ rank, children }) => {
  const tw = useTailwind();

  if (!isTopRank(rank)) {
    return <>{children}</>;
  }

  const emoji = PODIUM_EMOJI[rank as 1 | 2 | 3];

  return (
    <View style={tw.style('relative')} testID={`top-rank-crown-${rank}`}>
      {children}
      <View
        style={tw.style('absolute -top-[14px] -right-[12px] rotate-[15deg]')}
      >
        <Text style={tw.style('text-[28px] leading-[32px]')}>{emoji}</Text>
      </View>
    </View>
  );
};

export default CrownEmoji;
