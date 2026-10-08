import type { Position } from '@metamask/social-controllers';
import { isPerpPosition } from '../../../../UI/SocialFeed/utils/perp';

export type ProfileAssetFilter = 'all' | 'tokens' | 'perps';

export const splitPositionsByType = (
  positions: Position[],
): { tokens: Position[]; perps: Position[] } => {
  const tokens: Position[] = [];
  const perps: Position[] = [];

  positions.forEach((position) => {
    if (isPerpPosition(position)) {
      perps.push(position);
    } else {
      tokens.push(position);
    }
  });

  return { tokens, perps };
};

export const getFilteredPositionSections = (
  positions: Position[],
  filter: ProfileAssetFilter,
): { tokens: Position[]; perps: Position[] } => {
  const { tokens, perps } = splitPositionsByType(positions);

  if (filter === 'tokens') {
    return { tokens, perps: [] };
  }
  if (filter === 'perps') {
    return { tokens: [], perps };
  }
  return { tokens, perps };
};

export const getProfilePositionsEmptyMessageKey = (
  tab: 'open' | 'closed',
  filter: ProfileAssetFilter,
): string => {
  if (filter === 'tokens') {
    return tab === 'open'
      ? 'social_leaderboard.my_profile.empty_open_tokens'
      : 'social_leaderboard.my_profile.empty_closed_tokens';
  }
  if (filter === 'perps') {
    return tab === 'open'
      ? 'social_leaderboard.my_profile.empty_open_perps'
      : 'social_leaderboard.my_profile.empty_closed_perps';
  }
  return tab === 'open'
    ? 'social_leaderboard.my_profile.empty_open'
    : 'social_leaderboard.my_profile.empty_closed';
};
