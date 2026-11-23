import type { PredictTeam } from '../../types';
import type { GameSelection, GameTeamOrder } from './createGamePresentation';

/** A Team's side in a side-by-side matchup. */
export type MatchupSlot = 'left' | 'right';

/** The first Team in the Game's order takes the left slot. */
export const getMatchupSlot = (
  order: GameTeamOrder,
  selection: GameSelection,
): MatchupSlot => (order[0] === selection ? 'left' : 'right');

/**
 * In a side-by-side matchup both logos face the centre: the left one faces
 * right and the right one faces left. A logo is mirrored only when its art
 * points away from the centre. A logo without a facing is never mirrored.
 */
export const shouldMirrorTeamLogo = (
  team: PredictTeam,
  slot: MatchupSlot,
): boolean => team.logoFacing !== undefined && team.logoFacing === slot;
