import { RECENT_OPENINGS_LIMIT } from '../constants/packPartner';
import type { PpWinner } from '../schemas/packPartner';
import type { PackPartnerOpening } from '../types/openings';
import { inventoryCardFromNft } from './cards';

/** PackPartner prize tiers, from `getAllWinners`. */
const PRIZE_TIERS = {
  1: 'epic',
  2: 'rare',
  3: 'uncommon',
  4: 'common',
} as const;

/**
 * Public opening event of one PackPartner winner. It never grants
 * ownership or a sell action.
 *
 * @param winner - Winner returned by `getAllWinners`.
 * @returns The opening.
 */
export const openingFromWinner = (winner: PpWinner): PackPartnerOpening => ({
  ...inventoryCardFromNft({
    ...winner.nft,
    nft_address: winner.nft_address,
    insured_value: winner.insuredValue,
    rarity: winner.prize_tier ? PRIZE_TIERS[winner.prize_tier] : undefined,
  }),
  id: `${winner.nft_address}:${new Date(winner.created_at).toISOString()}:${winner.winner}`,
  openedAt: Date.parse(winner.created_at),
  sourcePackCode: winner.pack_type,
  openerAddress: winner.winner,
});

/**
 * Latest public openings of a pack, or of every pack when `packCode` is
 * empty: one entry per opening event (a mint pulled twice is two events),
 * newest first, bounded by limit (20 by default).
 *
 * @param winners - Winners returned by `getAllWinners`.
 * @param packCode - Pack machine code, empty for every pack.
 * @param limit - Maximum result size.
 * @returns The openings.
 */
export const openingsFromWinners = (
  winners: readonly PpWinner[],
  packCode: string,
  limit = RECENT_OPENINGS_LIMIT,
): PackPartnerOpening[] =>
  [
    ...new Map(
      winners
        .filter((winner) => !packCode || winner.pack_type === packCode)
        .map(openingFromWinner)
        .map((opening) => [opening.id, opening]),
    ).values(),
  ]
    .sort((a, b) => b.openedAt - a.openedAt)
    .slice(0, limit);

/**
 * Opening snapshots merged by event ID, newest first and bounded by limit.
 * Missing fields in a later response never erase known metadata.
 *
 * @param previous - Openings already shown.
 * @param incoming - Newer openings.
 * @param limit - Maximum result size.
 * @returns The merged openings.
 */
export const mergeOpenings = (
  previous: readonly PackPartnerOpening[],
  incoming: readonly PackPartnerOpening[],
  limit = RECENT_OPENINGS_LIMIT,
): PackPartnerOpening[] => {
  const events = new Map(previous.map((opening) => [opening.id, opening]));
  incoming.forEach((opening) => {
    const defined = Object.fromEntries(
      Object.entries(opening).filter(([, value]) => value !== undefined),
    );
    events.set(opening.id, {
      ...opening,
      ...events.get(opening.id),
      ...defined,
    });
  });
  return [...events.values()]
    .sort((a, b) => b.openedAt - a.openedAt)
    .slice(0, limit);
};
